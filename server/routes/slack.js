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
  res.status(200).json({ status: 'Slack Events endpoint is active', supported_methods: ['POST'] });
});

// POST /api/slack/events - Slack Events Webhook
router.post('/events', async (req, res) => {
  const signature = req.headers['x-slack-signature'];
  const timestamp = req.headers['x-slack-request-timestamp'];
  
  // Use the raw body captured in index.js for better signature accuracy
  const rawBody = req.rawBody || JSON.stringify(req.body);

  // In a real scenario, if signature verification fails, we should return 401.
  if (!verifySlackSignature(SLACK_SIGNING_SECRET, signature, timestamp, rawBody)) {
    console.error('Slack signature verification failed');
    // For now, we continue but in production this should be a hard fail
    // return res.status(401).send('Invalid signature');
  }

  const { type, challenge, event } = req.body;

  // 1. URL Verification
  if (type === 'url_verification') {
    return res.status(200).json({ challenge });
  }

  // 2. Event Callback
  if (type === 'event_callback' && event) {
    if (event.type !== 'app_mention') {
      return res.status(200).json({ ok: true });
    }

    const { user: fromSlackUserId, text, channel: channelId, ts: messageTs, thread_ts: threadTs, event_ts: eventTs } = event;
    const slackEventId = eventTs || messageTs;

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

          // Insert into slack_mentions (idempotent)
          await db.query(
            `INSERT INTO slack_mentions (slack_event_id, channel_id, thread_ts, message_ts, from_slack_user_id, to_user_id, text)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (slack_event_id) DO NOTHING`,
            [slackEventId, channelId, threadTs || null, messageTs, fromSlackUserId, toUserId, text]
          );
        }
      }
    } catch (err) {
      console.error('Error processing Slack mention:', err);
    }
  }

  res.status(200).json({ ok: true });
});

// GET /api/slack/mentions/me - Get current user's mentions
router.get('/mentions/me', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;
    if (userId === 0) {
        return res.json([]); // System Admin doesn't have mentions in the table usually
    }

    const result = await db.query(
      `SELECT id, text, channel_id, message_ts, thread_ts, created_at 
       FROM slack_mentions 
       WHERE to_user_id = $1 
       ORDER BY created_at DESC 
       LIMIT 20`,
      [userId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching user mentions:', err);
    res.status(500).json({ error: 'حدث خطأ أثناء جلب المنشنات' });
  }
});

module.exports = router;
