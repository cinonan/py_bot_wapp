const { ZodError } = require('zod');
const { dispatchOrderCommandSchema } = require('../domain/messaging/messageSchemas');

function createHandleDispatchOrderCommand({ publishStreamEvent, dispatchOrder }) {
  return async function handleDispatchOrderCommand(envelope) {
    dispatchOrderCommandSchema.parse(envelope);

    try {
      const result = await dispatchOrder({
        payloadJson: envelope.payload,
      });
      await publishStreamEvent(envelope, result.eventType, result.payload);
      return true;
    } catch (error) {
      if (error instanceof ZodError) {
        await publishStreamEvent(envelope, 'OrderDispatchFailed', {
          reason: 'validation',
          issues: error.issues.map((issue) => issue.message),
        });
        return true;
      }

      throw error;
    }
  };
}

module.exports = { createHandleDispatchOrderCommand };
