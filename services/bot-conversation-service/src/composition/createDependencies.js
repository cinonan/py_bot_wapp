const { createRedisClient } = require('../modules/bot-conversation/infrastructure/redis/client');

function createDependencies(config = {}) {
  const redisUrl = config.redisUrl || process.env.REDIS_URL;

  return {
    redis: createRedisClient(redisUrl),
  };
}

module.exports = { createDependencies };
