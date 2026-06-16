const { getClientByPhoneCommandSchema } = require('../domain/messaging/messageSchemas');

function createHandleGetClientByPhoneCommand({ publishStreamEvent, getClientByPhone }) {
  return async function handleGetClientByPhoneCommand(envelope) {
    getClientByPhoneCommandSchema.parse(envelope);
    const result = await getClientByPhone({ phone: envelope.phone });
    await publishStreamEvent(envelope, result.eventType, result.payload);
    return true;
  };
}

module.exports = { createHandleGetClientByPhoneCommand };
