const { getProductCatalogCommandSchema } = require('../domain/messaging/messageSchemas');

function createHandleGetProductCatalogCommand({ publishStreamEvent, getProductCatalog }) {
  return async function handleGetProductCatalogCommand(envelope) {
    getProductCatalogCommandSchema.parse(envelope);
    const result = await getProductCatalog();
    await publishStreamEvent(envelope, result.eventType, result.payload);
    return true;
  };
}

module.exports = { createHandleGetProductCatalogCommand };
