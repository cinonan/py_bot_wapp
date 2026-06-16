const { clearCartCommandSchema } = require('../domain/messaging/messageSchemas');

function createHandleClearCartCommand({ publishStreamEvent, clearCart }) {
  return async function handleClearCartCommand(envelope) {
    clearCartCommandSchema.parse(envelope);
    const result = await clearCart({ phone: envelope.phone });
    await publishStreamEvent(envelope, result.eventType, result.payload);
    return true;
  };
}

module.exports = { createHandleClearCartCommand };
