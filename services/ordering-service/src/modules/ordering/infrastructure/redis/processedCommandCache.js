const PROCESSED_COMMAND_TTL_SECONDS = 60 * 60;
const PROCESSED_COMMAND_KEY_PREFIX = 'ordering:processed';

/**
 * @typedef {object} ProcessedCommandCacheEntry
 * @property {string} eventType
 * @property {object} payload
 */

/**
 * @typedef {object} ProcessedCommandCachePort
 * @property {(wamid: string) => Promise<ProcessedCommandCacheEntry|null>} get
 * @property {(wamid: string, entry: ProcessedCommandCacheEntry) => Promise<void>} set
 */

/**
 * @param {{ redis: import('redis').RedisClientType, ttlSeconds?: number }} deps
 * @returns {ProcessedCommandCachePort}
 */
function createProcessedCommandCache({ redis, ttlSeconds = PROCESSED_COMMAND_TTL_SECONDS }) {
  function cacheKey(wamid) {
    return `${PROCESSED_COMMAND_KEY_PREFIX}:${wamid}`;
  }

  return {
    async get(wamid) {
      const raw = await redis.get(cacheKey(wamid));
      if (!raw) {
        return null;
      }

      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed.eventType !== 'string') {
        return null;
      }

      return {
        eventType: parsed.eventType,
        payload: parsed.payload ?? {},
      };
    },

    async set(wamid, entry) {
      await redis.set(cacheKey(wamid), JSON.stringify(entry), { EX: ttlSeconds });
    },
  };
}

module.exports = {
  createProcessedCommandCache,
  PROCESSED_COMMAND_TTL_SECONDS,
  PROCESSED_COMMAND_KEY_PREFIX,
};
