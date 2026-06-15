const request = require('supertest');
const { createApp } = require('../src/app');

describe('GET /health', () => {
  test('returns 200 when Redis is reachable', async () => {
    const redis = {
      isOpen: true,
      connect: jest.fn(),
      ping: jest.fn().mockResolvedValue('PONG'),
    };

    const response = await request(createApp({ redis })).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok', redis: 'connected' });
    expect(redis.ping).toHaveBeenCalled();
  });

  test('returns 503 when Redis is unreachable', async () => {
    const redis = {
      isOpen: false,
      connect: jest.fn().mockRejectedValue(new Error('connection refused')),
      ping: jest.fn(),
    };

    const response = await request(createApp({ redis })).get('/health');

    expect(response.status).toBe(503);
    expect(response.body).toEqual({ status: 'error', redis: 'disconnected' });
  });
});
