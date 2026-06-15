const { createStreamConsumer } = require('../infrastructure/redis/streamConsumer');

function createOrderingStreamConsumer({ redis, handleStreamCommand }) {
  return createStreamConsumer({
    redis,
    consumerName: process.env.STREAM_CONSUMER_NAME || 'ordering-1',
    handler: async ({ fields }) => {
      try {
        await handleStreamCommand({ fields });
        return true;
      } catch (error) {
        console.error('Stream command failed:', error.message);
        return false;
      }
    },
  });
}

module.exports = { createOrderingStreamConsumer };
