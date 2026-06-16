const { getStreamMaxRetries } = require('../../domain/messaging/streamConfig');
const { createProcessStreamMessage } = require('../../application/processStreamMessage');
const { createPublishStreamEvent } = require('../../application/publishStreamEvent');
const { createStreamLogger } = require('./streamLogger');

function createOrderingStreamConsumer({
  redis,
  dispatchStreamCommand,
  eventPublisher,
  publishToDlq,
  maxRetries = getStreamMaxRetries(),
  logger = createStreamLogger(),
}) {
  const { createStreamConsumer } = require('./streamConsumer');
  const publishStreamEvent = createPublishStreamEvent(eventPublisher);
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
