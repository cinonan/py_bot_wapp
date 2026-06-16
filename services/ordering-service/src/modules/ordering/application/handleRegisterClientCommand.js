const { ZodError } = require('zod');
const { DuplicateClientError } = require('../domain/client/duplicateClientError');
const { registerClientCommandSchema } = require('../domain/messaging/messageSchemas');

function createHandleRegisterClientCommand({ publishStreamEvent, registerClient }) {
  return async function handleRegisterClientCommand(envelope) {
    registerClientCommandSchema.parse(envelope);

    try {
      const result = await registerClient({
        phone: envelope.phone,
        payloadJson: envelope.payload,
      });
      await publishStreamEvent(envelope, result.eventType, result.payload);
      return true;
    } catch (error) {
      if (error instanceof ZodError) {
        await publishStreamEvent(envelope, 'RegisterClientFailed', {
          reason: 'validation',
          issues: error.issues.map((issue) => issue.message),
        });
        return true;
      }

      if (error instanceof DuplicateClientError) {
        await publishStreamEvent(envelope, 'RegisterClientFailed', {
          reason: 'duplicate',
          message: error.message,
        });
        return true;
      }

      throw error;
    }
  };
}

module.exports = { createHandleRegisterClientCommand };
