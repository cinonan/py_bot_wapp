const { STREAM_ORDERING_DLQ } = require('../../domain/messaging/streams');

function createDlqPublisher({ redis }) {
  return {
    async publishToDlq({ messageId, fields, error, context }) {
      const record = context || fields;

      await redis.xAdd(STREAM_ORDERING_DLQ, '*', {
        sourceMessageId: messageId,
        type: record.type || 'unknown',
        wamid: record.wamid || 'unknown',
        correlationId: record.correlationId || 'unknown',
        payload: record.payload ?? '{}',
        errorMessage: error.message,
        timestamp: new Date().toISOString(),
      });
    },
  };
}

module.exports = { createDlqPublisher };
