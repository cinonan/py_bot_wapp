const crypto = require('crypto');
const {
  createWebhookSignatureValidator,
  signWebhookPayload,
} = require('../../src/modules/bot-conversation/infrastructure/meta/webhookSignatureValidator');

describe('webhook signature validator', () => {
  const appSecret = 'test-app-secret';
  const payload = JSON.stringify({ object: 'whatsapp_business_account', entry: [] });
  const validator = createWebhookSignatureValidator({ appSecret });

  test('accepts a valid X-Hub-Signature-256 header', () => {
    const signature = signWebhookPayload(payload, appSecret);

    expect(validator.isValid(payload, signature)).toBe(true);
  });

  test('rejects when the signature header is missing', () => {
    expect(validator.isValid(payload, undefined)).toBe(false);
    expect(validator.isValid(payload, '')).toBe(false);
  });

  test('rejects when the signature does not match the payload', () => {
    const signature = signWebhookPayload(payload, 'wrong-secret');

    expect(validator.isValid(payload, signature)).toBe(false);
  });

  test('rejects when the payload was tampered after signing', () => {
    const signature = signWebhookPayload(payload, appSecret);
    const tampered = `${payload.slice(0, -1)}X`;

    expect(validator.isValid(tampered, signature)).toBe(false);
  });

  test('rejects malformed signature headers', () => {
    const digest = crypto.createHmac('sha256', appSecret).update(payload).digest('hex');

    expect(validator.isValid(payload, `md5=${digest}`)).toBe(false);
    expect(validator.isValid(payload, digest)).toBe(false);
  });
});
