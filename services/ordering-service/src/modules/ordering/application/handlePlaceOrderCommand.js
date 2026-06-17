const { ZodError } = require('zod');
const { placeOrderCommandSchema } = require('../domain/messaging/messageSchemas');

function createHandlePlaceOrderCommand({ publishStreamEvent, placeOrder }) {
  return async function handlePlaceOrderCommand(envelope) {
    placeOrderCommandSchema.parse(envelope);

    try {
      const result = await placeOrder({
        phone: envelope.phone,
        payloadJson: envelope.payload,
      });
      await publishStreamEvent(envelope, result.eventType, result.payload);
      return true;
    } catch (error) {
      if (error instanceof ZodError) {
        await publishStreamEvent(envelope, 'OrderPlaceFailed', {
          reason: 'validation',
          issues: error.issues.map((issue) => issue.message),
        });
        return true;
      }

      throw error;
    }
  };
}

module.exports = { createHandlePlaceOrderCommand };
