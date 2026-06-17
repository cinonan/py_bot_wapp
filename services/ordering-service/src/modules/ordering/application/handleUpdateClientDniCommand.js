const { ZodError } = require('zod');
const { DuplicateDniError } = require('../domain/client/duplicateDniError');
const { updateClientDniCommandSchema } = require('../domain/messaging/messageSchemas');

function createHandleUpdateClientDniCommand({ publishStreamEvent, updateClientDni }) {
  return async function handleUpdateClientDniCommand(envelope) {
    updateClientDniCommandSchema.parse(envelope);

    try {
      const result = await updateClientDni({
        phone: envelope.phone,
        payloadJson: envelope.payload,
      });
      await publishStreamEvent(envelope, result.eventType, result.payload);
      return true;
    } catch (error) {
      if (error instanceof ZodError) {
        await publishStreamEvent(envelope, 'UpdateClientDniFailed', {
          reason: 'validation',
          issues: error.issues.map((issue) => issue.message),
        });
        return true;
      }

      if (error instanceof DuplicateDniError) {
        await publishStreamEvent(envelope, 'UpdateClientDniFailed', {
          reason: 'duplicate',
          message: error.message,
        });
        return true;
      }

      throw error;
    }
  };
}

module.exports = { createHandleUpdateClientDniCommand };
