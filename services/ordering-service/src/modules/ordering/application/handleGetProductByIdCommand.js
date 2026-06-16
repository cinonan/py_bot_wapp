const { parseGetProductByIdPayload } = require('../domain/product/productSchema');
const { getProductByIdCommandSchema } = require('../domain/messaging/messageSchemas');

function createHandleGetProductByIdCommand({ publishStreamEvent, getProductById }) {
  return async function handleGetProductByIdCommand(envelope) {
    getProductByIdCommandSchema.parse(envelope);
    const { productId } = parseGetProductByIdPayload(envelope.payload);
    const result = await getProductById({ productId });
    await publishStreamEvent(envelope, result.eventType, result.payload);
    return true;
  };
}

module.exports = { createHandleGetProductByIdCommand };
