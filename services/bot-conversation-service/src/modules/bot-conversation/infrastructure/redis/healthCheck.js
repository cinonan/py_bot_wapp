async function checkRedisHealth(redis) {
  if (!redis.isOpen) {
    await redis.connect();
  }

  await redis.ping();
  return { redis: 'connected' };
}

module.exports = { checkRedisHealth };
