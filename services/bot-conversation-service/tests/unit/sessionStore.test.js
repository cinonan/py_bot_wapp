const { createSessionStore, SESSION_TTL_SECONDS } = require('../../src/modules/bot-conversation/infrastructure/redis/sessionStore');

describe('session store', () => {
  test('persists session data with configurable TTL defaulting to one hour', async () => {
    const redis = {
      get: jest.fn(),
      set: jest.fn().mockResolvedValue('OK'),
      del: jest.fn(),
    };
    const sessionStore = createSessionStore({ redis });

    expect(sessionStore.getTtlSeconds()).toBe(SESSION_TTL_SECONDS);
    expect(SESSION_TTL_SECONDS).toBe(60 * 60);

    await sessionStore.set('51999001001', {
      state: 'AWAITING_REGISTRATION_NAME',
      metadata: { name: 'Ana' },
    });

    expect(redis.set).toHaveBeenCalledWith(
      'bot:session:51999001001',
      expect.any(String),
      { EX: SESSION_TTL_SECONDS },
    );
  });

  test('uses a custom TTL when provided', async () => {
    const redis = {
      get: jest.fn(),
      set: jest.fn().mockResolvedValue('OK'),
      del: jest.fn(),
    };
    const customTtl = 120;
    const sessionStore = createSessionStore({ redis, ttlSeconds: customTtl });

    expect(sessionStore.getTtlSeconds()).toBe(customTtl);

    await sessionStore.set('51999001002', {
      state: 'CONFIRMING_ADDRESS',
      metadata: {},
    });

    expect(redis.set).toHaveBeenCalledWith(
      'bot:session:51999001002',
      expect.any(String),
      { EX: customTtl },
    );
  });
});
