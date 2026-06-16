const request = require('supertest');
const { createApp } = require('../src/app');
const { signWebhookPayload } = require('../src/modules/bot-conversation/infrastructure/meta/webhookSignatureValidator');

describe('POST /webhook signature integration', () => {
  const appSecret = 'integration-app-secret';
  const verifyToken = 'integration-verify-token';
  const webhookHandler = jest.fn((_req, res) => {
    res.sendStatus(200);
  });

  function createTestApp() {
    return createApp({
      redis: {
        isOpen: true,
        ping: jest.fn().mockResolvedValue('PONG'),
      },
      webhookVerifyHandler: createWebhookVerifyHandlerStub(),
      webhookSignatureValidator: createWebhookSignatureValidatorStub(),
      webhookHandler,
    });
  }

  function createWebhookVerifyHandlerStub() {
    const { createWebhookVerifyHandler } = require('../src/modules/bot-conversation/infrastructure/meta/webhookVerifyHandler');
    return createWebhookVerifyHandler({ verifyToken });
  }

  function createWebhookSignatureValidatorStub() {
    const {
      createWebhookSignatureValidator,
    } = require('../src/modules/bot-conversation/infrastructure/meta/webhookSignatureValidator');
    return createWebhookSignatureValidator({ appSecret });
  }

  beforeEach(() => {
    webhookHandler.mockClear();
  });

  test('returns 200 for a correctly signed POST payload', async () => {
    const payload = {
      object: 'whatsapp_business_account',
      entry: [],
    };
    const rawBody = JSON.stringify(payload);
    const signature = signWebhookPayload(rawBody, appSecret);

    const response = await request(createTestApp())
      .post('/webhook')
      .set('Content-Type', 'application/json')
      .set('X-Hub-Signature-256', signature)
      .send(payload);

    expect(response.status).toBe(200);
    expect(webhookHandler).toHaveBeenCalled();
  });

  test('returns 401 when X-Hub-Signature-256 is missing', async () => {
    const response = await request(createTestApp())
      .post('/webhook')
      .set('Content-Type', 'application/json')
      .send({ object: 'whatsapp_business_account' });

    expect(response.status).toBe(401);
    expect(webhookHandler).not.toHaveBeenCalled();
  });

  test('returns 403 when the signature is invalid', async () => {
    const payload = { object: 'whatsapp_business_account' };

    const response = await request(createTestApp())
      .post('/webhook')
      .set('Content-Type', 'application/json')
      .set('X-Hub-Signature-256', 'sha256=deadbeef')
      .send(payload);

    expect(response.status).toBe(403);
    expect(webhookHandler).not.toHaveBeenCalled();
  });
});
