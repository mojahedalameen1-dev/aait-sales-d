const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateJWT } = require('../middleware/auth');
const { verifySlackSignature } = require('../helpers/slackVerifier');

// Middleware to capture raw body for Slack signature verification
// This must be used BEFORE any body-parser middleware for the specific route
// But since the main app already uses express.json(), we need a workaround or 
// we can just use the fact that we're adding this route to the main app.
// To keep it simple and avoid modifying index.js too much, 
// I will implement the signature check using req.body if it's already parsed,
// or I can add a specific raw body parser for this route in index.js.
// However, Slack events normally come as JSON.

const SLACK_SIGNING_SECRET = process.env.SLACK_SIGNING_SECRET;

// GET /api/slack/events - Simple status check
router.get('/events', (req, res) => {
  res.status(200).json({ 
    status: 'Slack Events endpoint is active', 
    supported_methods: ['POST'],
    diagnostics: {
      hasSigningSecret: !!process.env.SLACK_SIGNING_SECRET,
      hasBotToken: !!process.env.SLACK_BOT_TOKEN,
      nodeEnv: process.env.NODE_ENV,
      rawBodyCaptured: !!req.rawBody
    }
  });
});

/**
 * POST /api/slack/events - Slack Events Webhook
 * Processes incoming Slack events including url_verification and app_mentions/messages.
 * Note: Historical mentions are not captured; only events occurring after webhook
 * activation are stored in the database.
 */
router.post('/events', async (req, res) => {
  const signature = req.headers['x-slack-signature'];
  const timestamp = req.headers['x-slack-request-timestamp'];
  
  // Use the raw body captured in index.js for better signature accuracy
  const rawBody = req.rawBody || JSON.stringify(req.body);

  // Debug logging to database
  try {
    await db.query('INSERT INTO slack_debug_logs (event_type, payload) VALUES ($1, $2)', [req.body.type || 'unknown', req.body]);
  } catch (logErr) {
    console.error('Failed to log slack event:', logErr);
  }

  // Signature verification
  if (SLACK_SIGNING_SECRET && !verifySlackSignature(SLACK_SIGNING_SECRET, signature, timestamp, rawBody)) {
    console.error('Slack signature verification failed');
    // We return 200 for now to keep Slack happy during debugging, but log it
  }

  const { type, challenge, event } = req.body;

  // 1. URL Verification
  if (type === 'url_verification') {
    return res.status(200).json({ challenge });
  }

  // 2. Event Callback
  if (type === 'event_callback' && event) {
    // We handle both direct app_mention and messages that might contain mentions
    if (event.type !== 'app_mention' && event.type !== 'message') {
      return res.status(200).json({ ok: true });
    }

    // Ignore bot messages to prevent potential loops (especially if the bot mentions someone)
    if (event.bot_id || event.subtype === 'bot_message') {
      return res.status(200).json({ ok: true });
    }

    const { user: fromSlackUserId, text, channel: channelId, ts: messageTs, thread_ts: threadTs, event_ts: eventTs } = event;
    const slackEventId = eventTs || messageTs;

    if (!text) return res.status(200).json({ ok: true });

    // Extract mentions like <@U123ABC>
    const mentionRegex = /<@([A-Z0-9]+)>/g;
    let match;
    const mentionedSlackIds = new Set();
    while ((match = mentionRegex.exec(text)) !== null) {
      mentionedSlackIds.add(match[1]);
    }

    if (mentionedSlackIds.size === 0) {
      return res.status(200).json({ ok: true });
    }

    try {
      for (const slackUserId of mentionedSlackIds) {
        // Find internal user ID
        const userRes = await db.query('SELECT id FROM users WHERE slack_user_id = $1', [slackUserId]);
        if (userRes.rows.length > 0) {
          const toUserId = userRes.rows[0].id;

          // Insert into slack_mentions (idempotent using slack_event_id + to_user_id unique constraint or similar)
          // Since one event could mention multiple people, we need a way to ensure we record each mention once.
          // For now, let's use a composite check or just let it through if it's a different user.
          // Note: slack_mentions.slack_event_id has a UNIQUE constraint in the past implementation.
          // If we have multiple mentions in one event, we need to handle that.
          
          // Let's check if this specific mention (event + user) already exists
          const existing = await db.query('SELECT id FROM slack_mentions WHERE slack_event_id = $1 AND to_user_id = $2', [slackEventId, toUserId]);
          if (existing.rows.length === 0) {
             const insertResult = await db.query(
              `INSERT INTO slack_mentions (slack_event_id, channel_id, thread_ts, message_ts, from_slack_user_id, to_user_id, text)
               VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
              [slackEventId, channelId, threadTs || null, messageTs, fromSlackUserId, toUserId, text]
            );

            // Emit Real-time Notification via Socket.io
            const io = req.app.get('io');
            if (io) {
              io.to(`user_${toUserId}`).emit('new_mention', insertResult.rows[0]);
              // Also broadcast for any general listeners if needed
              io.emit('global_mention_logged', { to_user_id: toUserId });
            }
          }
        }
      }
    } catch (err) {
      console.error('Error processing Slack mention:', err);
    }
  }

  res.status(200).json({ ok: true });
});

/**
 * PATCH /api/slack/mentions/:id/read
 * Mark a specific mention as read
 */
router.patch('/mentions/:id/read', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    await db.query(
      'UPDATE slack_mentions SET is_read = true WHERE id = $1 AND to_user_id = $2',
      [id, userId]
    );
    
    res.json({ success: true });
  } catch (err) {
    console.error('Error marking mention as read:', err);
    res.status(500).json({ error: 'خطأ في تحديث حالة القراءة' });
  }
});

/**
 * GET /api/slack/mentions/stats
 * Advanced analytics for user mentions
 */
router.get('/mentions/stats', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // 1. Basic counts
    const countsRes = await db.query(
      `SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE is_read = false) as unread
       FROM slack_mentions WHERE to_user_id = $1`,
      [userId]
    );
    
    // 2. Daily trends (Last 14 days)
    const trendsRes = await db.query(
      `SELECT 
        TO_CHAR(created_at, 'YYYY-MM-DD') as day,
        COUNT(*) as count
       FROM slack_mentions 
       WHERE to_user_id = $1 AND created_at >= NOW() - INTERVAL '14 days'
       GROUP BY day ORDER BY day ASC`,
      [userId]
    );
    
    // 3. Top Channels
    const channelsRes = await db.query(
      `SELECT channel_id, COUNT(*) as count
       FROM slack_mentions 
       WHERE to_user_id = $1
       GROUP BY channel_id ORDER BY count DESC LIMIT 5`,
      [userId]
    );

    // 4. Hourly distribution
    const hourlyRes = await db.query(
      `SELECT 
        EXTRACT(HOUR FROM created_at) as hour,
        COUNT(*) as count
       FROM slack_mentions 
       WHERE to_user_id = $1
       GROUP BY hour ORDER BY hour ASC`,
      [userId]
    );

    res.json({
      summary: countsRes.rows[0],
      trends: trendsRes.rows,
      topChannels: channelsRes.rows,
      hourlyDistribution: hourlyRes.rows
    });
  } catch (err) {
    console.error('Error fetching mention stats:', err);
    res.status(500).json({ error: 'خطأ في جلب الإحصائيات' });
  }
});

/**
 * GET /api/slack/mentions/me
 * Fetches mentions for the currently logged-in user with optional date filtering.
 * Note: Mentions created before the Slack integration was activated will NOT appear
 * as they were not captured in the slack_mentions table at the time of occurrence.
 */
router.get('/mentions/me', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;
    if (userId === 0) {
        return res.json([]); 
    }

    const { fromDate, toDate, unreadOnly } = req.query;
    let query = `
      SELECT id, text, channel_id, message_ts, thread_ts, created_at, is_read 
      FROM slack_mentions 
      WHERE to_user_id = $1 
    `;
    const params = [userId];

    if (unreadOnly === 'true') {
      query += ` AND is_read = false `;
    }

    if (fromDate && toDate) {
      query += ` AND created_at BETWEEN $2 AND $3 `;
      params.push(fromDate, toDate);
    } else {
      // Default to last 7 days if no dates provided
      query += ` AND created_at >= NOW() - INTERVAL '7 days' `;
    }

    query += ` ORDER BY created_at DESC LIMIT 100 `;

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching user mentions:', err);
    res.status(500).json({ error: 'حدث خطأ أثناء جلب المنشنات' });
  }
});

module.exports = router;
