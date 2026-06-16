const {
  STREAM_BOT_EVENTS,
  CONSUMER_GROUP_ORDERING,
} = require('../../domain/messaging/streams');

const BLOCK_MS = 2000;
const READ_COUNT = 10;

async function getDeliveryCount(redis, stream, group, messageId) {
  const pending = await redis.xPendingRange(stream, group, messageId, messageId, 1);

  if (pending.length === 0) {
    return 1;
  }

  return pending[0].deliveriesCounter;
}

async function ensureConsumerGroup(redis, stream, group) {
  try {
    await redis.xGroupCreate(stream, group, '0', { MKSTREAM: true });
  } catch (error) {
    if (!String(error.message).includes('BUSYGROUP')) {
      throw error;
    }
  }
}

function createStreamConsumer({ redis, handler, consumerName = 'ordering-1' }) {
  let running = false;
  let shuttingDown = false;
  const inFlight = new Set();
  let loopPromise = null;

  async function processMessage(stream, group, messageId, fields) {
    inFlight.add(messageId);

    try {
      const deliveryCount = await getDeliveryCount(redis, stream, group, messageId);
      const result = await handler({ messageId, fields, deliveryCount });

      if (result?.ack) {
        await redis.xAck(stream, group, messageId);
      }
    } finally {
      inFlight.delete(messageId);
    }
  }

  async function pollLoop() {
    await ensureConsumerGroup(redis, STREAM_BOT_EVENTS, CONSUMER_GROUP_ORDERING);

    while (running) {
      if (shuttingDown) {
        break;
      }

      const batches = await redis.xReadGroup(
        CONSUMER_GROUP_ORDERING,
        consumerName,
        [
          { key: STREAM_BOT_EVENTS, id: '0' },
          { key: STREAM_BOT_EVENTS, id: '>' },
        ],
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

          await processMessage(
            STREAM_BOT_EVENTS,
            CONSUMER_GROUP_ORDERING,
            message.id,
            message.message,
          );
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
          console.error('Ordering stream consumer error:', error.message);
        }
      });
    },

    async shutdown() {
      shuttingDown = true;
      running = false;

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

module.exports = { createStreamConsumer, ensureConsumerGroup, getDeliveryCount };
