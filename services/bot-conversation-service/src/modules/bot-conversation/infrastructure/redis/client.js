const { createClient } = require('redis');

function createRedisClient(redisUrl) {
  if (!redisUrl) {
    throw new Error('REDIS_URL is required');
  }

  const client = createClient({ url: redisUrl });
  client.on('error', (error) => {
    console.error('Redis client error:', error.message);
  });

  return client;
}

module.exports = { createRedisClient };
