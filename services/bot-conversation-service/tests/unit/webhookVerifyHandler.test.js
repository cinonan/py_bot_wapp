const request = require('supertest');
const { createWebhookVerifyHandler } = require('../../src/modules/bot-conversation/infrastructure/meta/webhookVerifyHandler');

describe('GET /webhook Meta verification', () => {
  const verifyToken = 'my-verify-token';
  const handler = createWebhookVerifyHandler({ verifyToken });

  test('returns the challenge when hub.verify_token matches', async () => {
    const app = require('express')();
    app.get('/webhook', handler);

    const response = await request(app)
      .get('/webhook')
      .query({
        'hub.mode': 'subscribe',
        'hub.verify_token': verifyToken,
        'hub.challenge': '1234567890',
      });

    expect(response.status).toBe(200);
    expect(response.text).toBe('1234567890');
  });

  test('rejects when hub.verify_token does not match', async () => {
    const app = require('express')();
    app.get('/webhook', handler);

    const response = await request(app)
      .get('/webhook')
      .query({
        'hub.mode': 'subscribe',
        'hub.verify_token': 'wrong-token',
        'hub.challenge': '1234567890',
      });

    expect(response.status).toBe(403);
  });

  test('rejects when hub.mode is not subscribe', async () => {
    const app = require('express')();
    app.get('/webhook', handler);

    const response = await request(app)
      .get('/webhook')
      .query({
        'hub.mode': 'unsubscribe',
        'hub.verify_token': verifyToken,
        'hub.challenge': '1234567890',
      });

    expect(response.status).toBe(403);
  });
});
