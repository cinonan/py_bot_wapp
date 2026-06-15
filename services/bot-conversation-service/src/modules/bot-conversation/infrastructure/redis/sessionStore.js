const SESSION_TTL_SECONDS = 60 * 60;
const SESSION_KEY_PREFIX = 'bot:session';

function createSessionStore({ redis, ttlSeconds = SESSION_TTL_SECONDS }) {
  function sessionKey(phone) {
    return `${SESSION_KEY_PREFIX}:${phone}`;
  }

  return {
    async get(phone) {
      const raw = await redis.get(sessionKey(phone));
      if (!raw) {
        return null;
      }

      const parsed = JSON.parse(raw);
      return {
        state: parsed.state,
        metadata: parsed.metadata || {},
      };
    },

    async set(phone, session) {
      const payload = JSON.stringify({
        state: session.state,
        metadata: session.metadata || {},
        updatedAt: new Date().toISOString(),
      });

      await redis.set(sessionKey(phone), payload, { EX: ttlSeconds });
      return session;
    },

    async clear(phone) {
      await redis.del(sessionKey(phone));
    },

    getTtlSeconds() {
      return ttlSeconds;
    },
  };
}

module.exports = { createSessionStore, SESSION_TTL_SECONDS, SESSION_KEY_PREFIX };
