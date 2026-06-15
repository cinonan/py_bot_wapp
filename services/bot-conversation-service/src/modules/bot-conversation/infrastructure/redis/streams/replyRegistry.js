class ReplyTimeoutError extends Error {
  constructor(timeoutMs) {
    super(`Reply not received within ${timeoutMs}ms`);
    this.name = 'ReplyTimeoutError';
    this.timeoutMs = timeoutMs;
    this.waitingMessage =
      'Estamos procesando tu solicitud, por favor espera un momento.';
  }
}

function createReplyRegistry() {
  const pending = new Map();

  return {
    waitFor(correlationId, timeoutMs) {
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          pending.delete(correlationId);
          reject(new ReplyTimeoutError(timeoutMs));
        }, timeoutMs);

        pending.set(correlationId, { resolve, reject, timer });
      });
    },

    resolve(correlationId, envelope) {
      const entry = pending.get(correlationId);

      if (!entry) {
        return false;
      }

      clearTimeout(entry.timer);
      entry.resolve(envelope);
      pending.delete(correlationId);
      return true;
    },

    rejectAll(error) {
      for (const entry of pending.values()) {
        clearTimeout(entry.timer);
        entry.reject(error);
      }
      pending.clear();
    },

    get pendingCount() {
      return pending.size;
    },
  };
}

module.exports = { createReplyRegistry, ReplyTimeoutError };
