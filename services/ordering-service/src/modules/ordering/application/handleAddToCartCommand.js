const { ZodError } = require('zod');
const { parseAddToCartPayload } = require('../domain/cart/cartSchemas');
const { addToCartCommandSchema } = require('../domain/messaging/messageSchemas');

function createHandleAddToCartCommand({ publishStreamEvent, addToCart }) {
  return async function handleAddToCartCommand(envelope) {
    addToCartCommandSchema.parse(envelope);

    try {
      const { productId, cantidad } = parseAddToCartPayload(envelope.payload);
      const result = await addToCart({
        phone: envelope.phone,
        productId,
        cantidad,
      });
      await publishStreamEvent(envelope, result.eventType, result.payload);
      return true;
    } catch (error) {
      if (error instanceof ZodError) {
        await publishStreamEvent(envelope, 'AddToCartFailed', {
          reason: 'validation',
          issues: error.issues.map((issue) => issue.message),
        });
        return true;
      }

      throw error;
    }
  };
}

module.exports = { createHandleAddToCartCommand };
