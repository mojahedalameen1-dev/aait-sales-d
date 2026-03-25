const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateJWT } = require('../middleware/auth');
const { verifySlackSignature } = require('../helpers/slackVerifier');

const axios = require('axios');

const SLACK_SIGNING_SECRET = process.env.SLACK_SIGNING_SECRET;
const SLACK_USER_TOKEN = process.env.SLACK_USER_TOKEN;
const SLACK_CHANNELS = process.env.SLACK_CHANNELS ? process.env.SLACK_CHANNELS.split(',') : [];

router.get('/sync-mentions', authenticateJWT, async (req, res) => {
  if (!SLACK_USER_TOKEN || SLACK_CHANNELS.length === 0) {
    console.error('Sync error: Missing config', { 
      hasToken: !!SLACK_USER_TOKEN, 
      channelsCount: SLACK_CHANNELS.length 
    });
    return res.status(400).json({ error: 'SLACK_USER_TOKEN or SLACK_CHANNELS is not configured' });
  }

  const results = { processedChannels: 0, newMentions: 0, errors: [] };

  try {
    // Get all users with slack_user_id for mapping
    const usersRes = await db.query('SELECT id, slack_user_id FROM users WHERE slack_user_id IS NOT NULL');
    const userMap = usersRes.rows.reduce((acc, u) => {
      acc[u.slack_user_id] = u.id;
      return acc;
    }, {});

    for (const channelId of SLACK_CHANNELS) {
      try {
        const syncRes = await db.query('SELECT last_ts FROM slack_sync_status WHERE channel_id = $1', [channelId]);
        const lastTs = syncRes.rows[0]?.last_ts || '0';

        const slackRes = await axios.get('https://slack.com/api/conversations.history', {
          headers: { 'Authorization': `Bearer ${SLACK_USER_TOKEN}` },
          params: { channel: channelId, oldest: lastTs, limit: 100 }
        });

        if (!slackRes.data.ok) {
          throw new Error(`Slack API error for ${channelId}: ${slackRes.data.error}`);
        }

        const messages = slackRes.data.messages || [];
        let latestTsInBatch = lastTs;

        for (const msg of messages) {
          if (parseFloat(msg.ts) > parseFloat(latestTsInBatch)) {
            latestTsInBatch = msg.ts;
          }

          const mentionMatches = msg.text?.match(/<@U[A-Z0-9]+>/g);
          if (mentionMatches) {
            for (const match of mentionMatches) {
              const slackUserId = match.substring(2, match.length - 1);
              const toUserId = userMap[slackUserId];

              if (toUserId) {
                try {
                  await db.query(
                    `INSERT INTO slack_mentions (slack_event_id, channel_id, thread_ts, message_ts, from_slack_user_id, to_user_id, text, created_at)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, to_timestamp($8)) ON CONFLICT DO NOTHING`,
                    [`poll_${msg.ts}`, channelId, msg.thread_ts || null, msg.ts, msg.user, toUserId, msg.text, parseFloat(msg.ts)]
                  );
                  results.newMentions++;
                  
                  const io = req.app.get('io');
                  if (io) {
                    io.to(`user_${toUserId}`).emit('new_mention', {
                      channel_id: channelId,
                      text: msg.text,
                      ts: msg.ts
                    });
                  }
                } catch (dbErr) { }
              }
            }
          }
        }

        await db.query(
          `INSERT INTO slack_sync_status (channel_id, last_ts, updated_at)
           VALUES ($1, $2, NOW())
           ON CONFLICT (channel_id) DO UPDATE SET last_ts = $2, updated_at = NOW()`,
          [channelId, latestTsInBatch]
        );

        results.processedChannels++;
      } catch (channelErr) {
        console.error(`Error syncing channel ${channelId}:`, channelErr.message);
        results.errors.push({ channelId, error: channelErr.message });
      }
    }

    if (results.newMentions > 0) {
      const io = req.app.get('io');
      if (io) io.emit('mentions_synced', { count: results.newMentions });
    }

    res.json(results);
  } catch (err) {
    console.error('Global sync error:', err);
    res.status(500).json({ error: 'حدث خطأ أثناء مزامنة المنشنات' });
  }
});

router.get('/oauth/callback', async (req, res) => {
  const { code } = req.query;
  
  if (!code) {
    return res.status(400).send('Missing code parameter');
  }

  try {
    const slackRes = await axios.post('https://slack.com/api/oauth.v2.access', null, {
      params: {
        client_id: process.env.SLACK_CLIENT_ID,
        client_secret: process.env.SLACK_CLIENT_SECRET,
        code
      }
    });

    if (!slackRes.data.ok) {
      return res.status(400).send(`Slack Auth Error: ${slackRes.data.error}`);
    }

    res.send(`
      <div style="font-family: sans-serif; text-align: center; padding: 50px;">
        <h1 style="color: #4A154B;">تم الاتصال بـ Slack بنجاح! ✅</h1>
        <p>يمكنك الآن إغلاق هذه النافذة والعودة للنظام.</p>
        <div style="background: #f4f4f4; padding: 20px; border-radius: 10px; display: inline-block; margin-top: 20px;">
          <strong>Workspace:</strong> ${slackRes.data.team?.name}<br>
          <strong>App ID:</strong> ${slackRes.data.app_id}
        </div>
      </div>
    `);
  } catch (err) {
    console.error('OAuth Callback Error:', err);
    res.status(500).send('Internal Server Error during Slack Authentication');
  }
});


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

router.post('/events', async (req, res) => {
  const signature = req.headers['x-slack-signature'];
  const timestamp = req.headers['x-slack-request-timestamp'];
  
  const rawBody = req.rawBody || JSON.stringify(req.body);

  try {
    await db.query('INSERT INTO slack_debug_logs (event_type, payload) VALUES ($1, $2)', [req.body.type || 'unknown', req.body]);
  } catch (logErr) {
    console.error('Failed to log slack event:', logErr);
  }

  if (SLACK_SIGNING_SECRET && !verifySlackSignature(SLACK_SIGNING_SECRET, signature, timestamp, rawBody)) {
    console.error('Slack signature verification failed');
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const { type, challenge, event } = req.body;

  if (type === 'url_verification') {
    return res.status(200).json({ challenge });
  }

  if (type === 'event_callback' && event) {
    if (event.type !== 'app_mention' && event.type !== 'message') {
      return res.status(200).json({ ok: true });
    }

    if (event.bot_id || event.subtype === 'bot_message') {
      return res.status(200).json({ ok: true });
    }

    const { user: fromSlackUserId, text, channel: channelId, ts: messageTs, thread_ts: threadTs, event_ts: eventTs } = event;
    const slackEventId = eventTs || messageTs;

    if (!text) return res.status(200).json({ ok: true });

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
        const userRes = await db.query('SELECT id FROM users WHERE slack_user_id = $1', [slackUserId]);
        if (userRes.rows.length > 0) {
          const toUserId = userRes.rows[0].id;

          const existing = await db.query('SELECT id FROM slack_mentions WHERE slack_event_id = $1 AND to_user_id = $2', [slackEventId, toUserId]);
          if (existing.rows.length === 0) {
             const insertResult = await db.query(
              `INSERT INTO slack_mentions (slack_event_id, channel_id, thread_ts, message_ts, from_slack_user_id, to_user_id, text)
               VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
              [slackEventId, channelId, threadTs || null, messageTs, fromSlackUserId, toUserId, text]
            );

            const io = req.app.get('io');
            if (io) {
              io.to(`user_${toUserId}`).emit('new_mention', insertResult.rows[0]);
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

router.get('/mentions/stats', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const countsRes = await db.query(
      `SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE is_read = false) as unread
       FROM slack_mentions WHERE to_user_id = $1`,
      [userId]
    );
    
    const trendsRes = await db.query(
      `SELECT 
        TO_CHAR(created_at, 'YYYY-MM-DD') as day,
        COUNT(*) as count
       FROM slack_mentions 
       WHERE to_user_id = $1 AND created_at >= NOW() - INTERVAL '14 days'
       GROUP BY day ORDER BY day ASC`,
      [userId]
    );
    
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
