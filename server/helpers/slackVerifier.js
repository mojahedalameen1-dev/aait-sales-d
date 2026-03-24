const crypto = require('crypto');

/**
 * Verifies the signature of a Slack request.
 * @param {string} signingSecret - The Slack signing secret from environment variables.
 * @param {string} signature - The x-slack-signature header value.
 * @param {string} timestamp - The x-slack-request-timestamp header value.
 * @param {string} rawBody - The raw request body as a string.
 * @returns {boolean} - True if the signature is valid, false otherwise.
 */
function verifySlackSignature(signingSecret, signature, timestamp, rawBody) {
  if (!signingSecret || !signature || !timestamp) {
    return false;
  }

  // Prevent replay attacks by checking if the timestamp is too old (e.g., > 5 minutes)
  const fiveMinutesAgo = Math.floor(Date.now() / 1000) - 60 * 5;
  if (parseInt(timestamp) < fiveMinutesAgo) {
    return false;
  }

  const sigBaseString = `v0:${timestamp}:${rawBody}`;
  const mySignature = 'v0=' + crypto
    .createHmac('sha256', signingSecret)
    .update(sigBaseString)
    .digest('hex');

  return crypto.timingSafeEqual(Buffer.from(mySignature), Buffer.from(signature));
}

module.exports = { verifySlackSignature };
