const {
  STREAM_ORDERING_EVENTS,
  CONSUMER_GROUP_BOT,
} = require('../../../domain/messaging/constants');
const { parseStreamEnvelope } = require('../../../domain/messaging/messageSchemas');

const BLOCK_MS = 2000;
const READ_COUNT = 10;

async function ensureConsumerGroup(redis, stream, group) {
  try {
    await redis.xGroupCreate(stream, group, '0', { MKSTREAM: true });
  } catch (error) {
    if (!String(error.message).includes('BUSYGROUP')) {
      throw error;
    }
  }
}

function createOrderingEventConsumer({ redis, replyRegistry, consumerName = 'bot-1' }) {
  let running = false;
  let shuttingDown = false;
  const inFlight = new Set();
  let loopPromise = null;

  async function processMessage(messageId, fields) {
    inFlight.add(messageId);

    try {
      const envelope = parseStreamEnvelope(fields);
      replyRegistry.resolve(envelope.correlationId, envelope);
      await redis.xAck(STREAM_ORDERING_EVENTS, CONSUMER_GROUP_BOT, messageId);
    } catch (error) {
      console.error('Failed to process ordering event:', error.message);
    } finally {
      inFlight.delete(messageId);
    }
  }

  async function pollLoop() {
    await ensureConsumerGroup(redis, STREAM_ORDERING_EVENTS, CONSUMER_GROUP_BOT);

    while (running) {
      if (shuttingDown) {
        break;
      }

      const batches = await redis.xReadGroup(
        CONSUMER_GROUP_BOT,
        consumerName,
        [{ key: STREAM_ORDERING_EVENTS, id: '>' }],
        { COUNT: READ_COUNT, BLOCK: BLOCK_MS },
      );

      if (!batches) {
        continue;
      }

      for (const batch of batches) {
        for (const message of batch.messages) {
          if (shuttingDown) {
            return;
          }

          await processMessage(message.id, message.message);
        }
      }
    }
  }

  return {
    async start() {
      if (running) {
        return;
      }

      running = true;
      loopPromise = pollLoop().catch((error) => {
        if (running) {
          console.error('Bot stream consumer error:', error.message);
        }
      });
    },

    async shutdown() {
      shuttingDown = true;
      running = false;
      replyRegistry.rejectAll(new Error('Stream consumer shutting down'));

      if (loopPromise) {
        await loopPromise.catch(() => {});
      }

      while (inFlight.size > 0) {
        await new Promise((resolve) => {
          setTimeout(resolve, 50);
        });
      }
    },

    get inFlightCount() {
      return inFlight.size;
    },
  };
}

module.exports = { createOrderingEventConsumer, ensureConsumerGroup };
