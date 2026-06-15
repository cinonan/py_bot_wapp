const { createRedisClient } = require('../modules/bot-conversation/infrastructure/redis/client');
const { createSessionStore } = require('../modules/bot-conversation/infrastructure/redis/sessionStore');
const {
  createReplyRegistry,
} = require('../modules/bot-conversation/infrastructure/redis/streams/replyRegistry');
const {
  createStreamCommandClient,
} = require('../modules/bot-conversation/infrastructure/redis/streams/commandClient');
const {
  createOrderingEventConsumer,
} = require('../modules/bot-conversation/infrastructure/redis/streams/eventConsumer');
const {
  createHandleConversationMessage,
} = require('../modules/bot-conversation/application/handleConversationMessage');
const { createWebhookHandler } = require('../modules/bot-conversation/application/webhookHandler');
const {
  createLoggingMessageSender,
} = require('../modules/bot-conversation/infrastructure/messaging/messageSender');

function createDependencies(config = {}) {
  const redisUrl = config.redisUrl || process.env.REDIS_URL;
  const replyTimeoutMs = Number(
    config.replyTimeoutMs || process.env.STREAM_REPLY_TIMEOUT_MS || 5000,
  );

  const redis = createRedisClient(redisUrl);
  const sessionStore = createSessionStore({ redis });
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
  const messageSender = config.messageSender || createLoggingMessageSender();
  const awaitWebhookProcessing = Boolean(config.awaitWebhookProcessing);
  const handleConversationMessage = createHandleConversationMessage({
    sessionStore,
    streamCommandClient,
  });
  const webhookHandler = createWebhookHandler({
    handleConversationMessage,
    messageSender,
    awaitProcessing: awaitWebhookProcessing,
  });

  return {
    redis,
    sessionStore,
    replyRegistry,
    streamCommandClient,
    streamEventConsumer,
    messageSender,
    handleConversationMessage,
    webhookHandler,
    replyTimeoutMs,
  };
}

module.exports = { createDependencies };
