const { createRedisClient } = require('../modules/bot-conversation/infrastructure/redis/client');
const {
  createReplyRegistry,
} = require('../modules/bot-conversation/infrastructure/redis/streams/replyRegistry');
const {
  createStreamCommandClient,
} = require('../modules/bot-conversation/infrastructure/redis/streams/commandClient');
const {
  createOrderingEventConsumer,
} = require('../modules/bot-conversation/infrastructure/redis/streams/eventConsumer');

function createDependencies(config = {}) {
  const redisUrl = config.redisUrl || process.env.REDIS_URL;
  const replyTimeoutMs = Number(
    config.replyTimeoutMs || process.env.STREAM_REPLY_TIMEOUT_MS || 5000,
  );

  const redis = createRedisClient(redisUrl);
  const replyRegistry = createReplyRegistry();
  const streamCommandClient = createStreamCommandClient({
    redis,
    replyRegistry,
    replyTimeoutMs,
  });
  const streamEventConsumer = createOrderingEventConsumer({
    redis,
    replyRegistry,
    consumerName: process.env.STREAM_CONSUMER_NAME || 'bot-1',
  });

  return {
    redis,
    replyRegistry,
    streamCommandClient,
    streamEventConsumer,
    replyTimeoutMs,
  };
}

module.exports = { createDependencies };
