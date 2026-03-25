import { NextRequest, NextResponse } from 'next/server';
import { verifySlackSignature } from '@/lib/slack-verifier';
import { slackService } from '@/services/slack.service';

/**
 * POST /api/slack/events
 * Entry point for Slack Events API (Webhooks).
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now();
  
  try {
    // 1. Capture headers and raw body for verification
    const signature = req.headers.get('x-slack-signature') || '';
    const timestamp = req.headers.get('x-slack-request-timestamp') || '';
    
    // We need the raw body as a string to verify the HMAC signature accurately
    const rawBody = await req.text();
    
    // 2. Security: Verify Slack Signature
    if (!verifySlackSignature(process.env.SLACK_SIGNING_SECRET!, signature, timestamp, rawBody)) {
      console.error('[SlackEvents] Invalid signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // 3. Parse payload
    const payload = JSON.parse(rawBody);
    const { type, challenge } = payload;

    // 4. Case: Slack URL Verification (Handshake)
    if (type === 'url_verification') {
      console.info('[SlackEvents] URL Verification challenge received');
      return NextResponse.json({ challenge });
    }

    // 5. Case: Event Callback
    if (type === 'event_callback') {
      // Process the event asynchronously (Next.js allows this, but we keep it fast)
      // Note: We don't await the service if we want to return 200 immediately,
      // but in serverless, we should await to ensure the work completes before the function terminates.
      // Since our service logic is optimized for < 3s, awaiting is safer.
      try {
        await slackService.handleEvent(payload);
      } catch (svcErr) {
        console.error('[SlackEvents] Service processing error:', svcErr);
        // We still return 200 to Slack to prevent excessive retries
      }
    }

    const duration = Date.now() - startTime;
    console.info(`[SlackEvents] Request processed in ${duration}ms`);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[SlackEvents] Global handler error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// Ensure the body is handled as text for signature verification
export const dynamic = 'force-dynamic';
