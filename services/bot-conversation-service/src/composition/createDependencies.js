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
const {
  createHandleAdminDispatchMessage,
} = require('../modules/bot-conversation/application/handleAdminDispatchMessage');
const { createWebhookHandler } = require('../modules/bot-conversation/application/webhookHandler');
const {
  createLoggingMessageSender,
} = require('../modules/bot-conversation/infrastructure/messaging/messageSender');
const {
  parseIncomingTextMessage,
} = require('../modules/bot-conversation/infrastructure/meta/incomingMessageParser');
const {
  createWebhookSignatureValidator,
} = require('../modules/bot-conversation/infrastructure/meta/webhookSignatureValidator');
const {
  createWebhookVerifyHandler,
} = require('../modules/bot-conversation/infrastructure/meta/webhookVerifyHandler');
const {
  isDeliveryStatusPayload,
} = require('../modules/bot-conversation/infrastructure/meta/deliveryStatusDetector');
const { SESSION_TTL_SECONDS } = require('../modules/bot-conversation/infrastructure/redis/sessionStore');

function createDependencies(config = {}) {
  const redisUrl = config.redisUrl || process.env.REDIS_URL;
  const replyTimeoutMs = Number(
    config.replyTimeoutMs || process.env.STREAM_REPLY_TIMEOUT_MS || 5000,
  );
  const verifyToken = config.verifyToken || process.env.WA_VERIFY_TOKEN;
  const appSecret = config.appSecret || process.env.WA_APP_SECRET;
  const adminOrderNotifyPhone = config.adminOrderNotifyPhone || process.env.ADMIN_ORDER_NOTIFY_PHONE || '';
  const sessionTtlSeconds = Number(
    config.sessionTtlSeconds || process.env.SESSION_TTL_SECONDS || SESSION_TTL_SECONDS,
  );

  const redis = createRedisClient(redisUrl);
  const sessionStore = createSessionStore({ redis, ttlSeconds: sessionTtlSeconds });
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
  const handleAdminDispatchMessage = createHandleAdminDispatchMessage({
    streamCommandClient,
    adminOrderNotifyPhone,
  });
  const handleConversationMessage = createHandleConversationMessage({
    sessionStore,
    streamCommandClient,
    adminOrderNotifyPhone,
    handleAdminDispatchMessage,
  });
  const webhookHandler = createWebhookHandler({
    handleConversationMessage,
    messageSender,
    parseIncomingTextMessage,
    isDeliveryStatusPayload,
    awaitProcessing: awaitWebhookProcessing,
  });
  const webhookVerifyHandler = createWebhookVerifyHandler({ verifyToken });
  const webhookSignatureValidator = createWebhookSignatureValidator({ appSecret });

  const appDeps = {
    redis,
    streamEventConsumer,
    webhookHandler,
    webhookVerifyHandler,
    webhookSignatureValidator,
  };

  if (config._exposeInternals) {
    return {
      ...appDeps,
      sessionStore,
      replyRegistry,
      streamCommandClient,
      messageSender,
      handleConversationMessage,
      replyTimeoutMs,
    };
  }

  return appDeps;
}

module.exports = { createDependencies };
