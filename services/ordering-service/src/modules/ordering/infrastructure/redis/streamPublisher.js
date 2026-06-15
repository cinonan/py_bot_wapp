const { STREAM_ORDERING_EVENTS } = require('../../domain/messaging/streams');

function createStreamPublisher({ redis }) {
  return {
    async publishEvent(envelope) {
      const fields = {
        type: envelope.type,
        wamid: envelope.wamid,
        correlationId: envelope.correlationId,
        phone: envelope.phone,
        timestamp: envelope.timestamp,
        payload: envelope.payload ?? '{}',
      };

      return redis.xAdd(STREAM_ORDERING_EVENTS, '*', fields);
    },
  };
}

module.exports = { createStreamPublisher };
