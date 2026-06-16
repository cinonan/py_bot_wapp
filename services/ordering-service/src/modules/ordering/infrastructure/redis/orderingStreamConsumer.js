function createOrderingStreamConsumer({ redis, dispatchStreamCommand }) {
  const { createStreamConsumer } = require('./streamConsumer');

  return createStreamConsumer({
    redis,
    consumerName: process.env.STREAM_CONSUMER_NAME || 'ordering-1',
    handler: async ({ fields }) => {
      try {
        await dispatchStreamCommand({ fields });
        return true;
      } catch (error) {
        console.error('Stream command failed:', error.message);
        return false;
      }
    },
  });
}

module.exports = { createOrderingStreamConsumer };
