const { getStreamMaxRetries } = require('../../domain/messaging/streamConfig');
const { createProcessStreamMessage } = require('../../application/processStreamMessage');
const { createStreamLogger } = require('./streamLogger');

function createOrderingStreamConsumer({
  redis,
  dispatchStreamCommand,
  publishStreamEvent,
  publishToDlq,
  maxRetries = getStreamMaxRetries(),
  logger = createStreamLogger(),
}) {
  const { createStreamConsumer } = require('./streamConsumer');
  const processStreamMessage = createProcessStreamMessage({
    dispatchStreamCommand,
    publishStreamEvent,
    publishToDlq,
    maxRetries,
    logger,
  });

  return createStreamConsumer({
    redis,
    consumerName: process.env.STREAM_CONSUMER_NAME || 'ordering-1',
    handler: processStreamMessage,
  });
}

module.exports = { createOrderingStreamConsumer };
