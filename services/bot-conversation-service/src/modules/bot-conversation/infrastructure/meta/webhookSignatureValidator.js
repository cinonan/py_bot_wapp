const crypto = require('crypto');

function signWebhookPayload(rawBody, appSecret) {
  const body = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(String(rawBody));
  const digest = crypto.createHmac('sha256', appSecret).update(body).digest('hex');
  return `sha256=${digest}`;
}

/**
 * @param {{ appSecret: string }} deps
 * @returns {{ isValid: (rawBody: Buffer|string, signatureHeader: string|undefined) => boolean }}
 */
function createWebhookSignatureValidator({ appSecret }) {
  function isValid(rawBody, signatureHeader) {
    if (!signatureHeader || !appSecret) {
      return false;
    }

    const [algorithm, providedHash] = String(signatureHeader).split('=');
    if (algorithm !== 'sha256' || !providedHash) {
      return false;
    }

    const body = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(String(rawBody));
    const expectedHash = crypto.createHmac('sha256', appSecret).update(body).digest('hex');

    try {
      return crypto.timingSafeEqual(
        Buffer.from(providedHash, 'hex'),
        Buffer.from(expectedHash, 'hex'),
      );
    } catch (_error) {
      return false;
    }
  }

  return { isValid };
}

module.exports = {
  createWebhookSignatureValidator,
  signWebhookPayload,
};
