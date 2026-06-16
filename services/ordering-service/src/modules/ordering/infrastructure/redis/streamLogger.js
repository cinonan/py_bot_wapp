function createStreamLogger() {
  return {
    logTransientFailure({ correlationId, wamid, messageId, attempt, error }) {
      console.error('Stream message transient failure:', {
        correlationId,
        wamid,
        messageId,
        attempt,
        error: error.message,
      });
    },

    logPermanentFailure({ correlationId, wamid, messageId, commandType, error }) {
      console.error('Stream message permanent failure:', {
        correlationId,
        wamid,
        messageId,
        commandType,
        error: error.message,
      });
    },

    logDlq({ correlationId, wamid, messageId, attempt, error }) {
      console.error('Stream message moved to DLQ:', {
        correlationId,
        wamid,
        messageId,
        attempt,
        error: error.message,
      });
    },
  };
}

module.exports = { createStreamLogger };
