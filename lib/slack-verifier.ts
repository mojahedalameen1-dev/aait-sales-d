import crypto from 'crypto';

/**
 * Verifies the Slack request signature to ensure it came from Slack.
 * @param signingSecret - SLACK_SIGNING_SECRET from environment variables.
 * @param signature - The x-slack-signature header value.
 * @param timestamp - The x-slack-request-timestamp header value.
 * @param rawBody - The raw request body as a string.
 * @returns boolean - true if the signature is valid.
 */
export function verifySlackSignature(
  signingSecret: string,
  signature: string,
  timestamp: string,
  rawBody: string
): boolean {
  if (!signingSecret || !signature || !timestamp) {
    console.error('[SlackAuth] Missing parameters for signature verification');
    return false;
  }

  // 1. Prevent replay attacks - ensure the request is not older than 5 minutes
  const currentTime = Math.floor(Date.now() / 1000);
  if (Math.abs(currentTime - parseInt(timestamp)) > 300) {
    console.error('[SlackAuth] Request timestamp too old');
    return false;
  }

  // 2. Re-create the verification string: v0:timestamp:raw_body
  const sigBaseString = `v0:${timestamp}:${rawBody}`;

  // 3. Generate HMAC-SHA256 hash using the secret
  const hmac = crypto.createHmac('sha256', signingSecret);
  const mySignature = `v0=${hmac.update(sigBaseString).digest('hex')}`;

  // 4. Compare using constant-time comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(mySignature, 'utf8'),
      Buffer.from(signature, 'utf8')
    );
  } catch (err) {
    console.error('[SlackAuth] Signature comparison error:', err);
    return false;
  }
}
