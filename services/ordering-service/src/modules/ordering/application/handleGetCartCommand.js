const { getCartCommandSchema } = require('../domain/messaging/messageSchemas');

function createHandleGetCartCommand({ publishStreamEvent, getCart }) {
  return async function handleGetCartCommand(envelope) {
    getCartCommandSchema.parse(envelope);
    const result = await getCart({ phone: envelope.phone });
    await publishStreamEvent(envelope, result.eventType, result.payload);
    return true;
  };
}

module.exports = { createHandleGetCartCommand };
