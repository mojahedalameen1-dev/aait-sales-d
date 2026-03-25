import sql from '@/lib/neon';

/**
 * Service to handle Slack Events logic
 */
export class SlackService {
  /**
   * Main entry for processing Slack event callbacks.
   */
  async handleEvent(payload: any) {
    const { type, event } = payload;

    if (type !== 'event_callback' || !event) return;

    // Log the event for debugging (Production Tracking)
    await this.logDebug(event.type, payload);

    // We only process messages and app_mentions
    if (event.type === 'app_mention' || event.type === 'message') {
      // Ignore bot messages
      if (event.bot_id || event.subtype === 'bot_message') return;

      await this.processMentions(event);
    }
  }

  /**
   * Extract mentions from text and save to database.
   */
  private async processMentions(event: any) {
    const { text, user: fromSlackUserId, channel: channelId, ts: messageTs, thread_ts: threadTs, event_ts: eventTs } = event;
    const slackEventId = eventTs || messageTs;

    if (!text) return;

    // Extract mentions like <@U123ABC>
    const mentionRegex = /<@([A-Z0-9]+)>/g;
    const matches = [...text.matchAll(mentionRegex)];
    const mentionedSlackIds = [...new Set(matches.map(m => m[1]))];

    if (mentionedSlackIds.length === 0) return;

    console.info(`[SlackService] Found ${mentionedSlackIds.length} mentions in event ${slackEventId}`);

    for (const slackUserId of mentionedSlackIds) {
      try {
        // 1. Find the internal user ID mapped to this Slack ID
        // Using neon sql tag for safe queries
        const users = await sql`
          SELECT id FROM users WHERE slack_user_id = ${slackUserId} LIMIT 1
        `;

        if (users.length > 0) {
          const toUserId = users[0].id;

          // 2. Insert into slack_mentions with idempotency
          // We use ON CONFLICT (slack_event_id) DO NOTHING OR check first.
          // The schema has unique(slack_event_id) and unique(message_ts, to_user_id).
          await sql`
            INSERT INTO slack_mentions (
              slack_event_id, 
              channel_id, 
              thread_ts, 
              message_ts, 
              from_slack_user_id, 
              to_user_id, 
              text,
              created_at
            ) VALUES (
              ${slackEventId}, 
              ${channelId}, 
              ${threadTs || null}, 
              ${messageTs}, 
              ${fromSlackUserId}, 
              ${toUserId}, 
              ${text},
              NOW()
            ) ON CONFLICT (slack_event_id) DO NOTHING
          `;
          
          console.info(`[SlackService] Logged mention for user ${toUserId} from ${fromSlackUserId}`);
        } else {
          console.warn(`[SlackService] User with Slack ID ${slackUserId} not found in database`);
        }
      } catch (err) {
        console.error(`[SlackService] Error processing mention for ${slackUserId}:`, err);
      }
    }
  }

  /**
   * Log raw events for traceability in production.
   */
  private async logDebug(eventType: string, payload: any) {
    try {
      await sql`
        INSERT INTO slack_debug_logs (event_type, payload) 
        VALUES (${eventType}, ${JSON.stringify(payload)})
      `;
    } catch (err) {
      console.error('[SlackService] Failed to log debug info:', err);
    }
  }
}

export const slackService = new SlackService();
