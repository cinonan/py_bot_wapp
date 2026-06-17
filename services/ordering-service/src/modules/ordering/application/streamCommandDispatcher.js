const { parseStreamEnvelope } = require('../domain/messaging/messageSchemas');
const { UnknownCommandError } = require('../domain/messaging/streamErrorClassification');
const { createHandlePingCommand } = require('./handlePingCommand');
const { createHandleGetClientByPhoneCommand } = require('./handleGetClientByPhoneCommand');
const { createHandleRegisterClientCommand } = require('./handleRegisterClientCommand');
const { createHandleGetProductCatalogCommand } = require('./handleGetProductCatalogCommand');
const { createHandleGetProductByIdCommand } = require('./handleGetProductByIdCommand');
const { createHandleAddToCartCommand } = require('./handleAddToCartCommand');
const { createHandleGetCartCommand } = require('./handleGetCartCommand');
const { createHandleClearCartCommand } = require('./handleClearCartCommand');
const { createHandleUpdateClientDniCommand } = require('./handleUpdateClientDniCommand');
const { createHandlePlaceOrderCommand } = require('./handlePlaceOrderCommand');
const { createHandleDispatchOrderCommand } = require('./handleDispatchOrderCommand');

function createStreamCommandDispatcher({
  publishStreamEvent,
  getClientByPhone,
  registerClient,
  getProductCatalog,
  getProductById,
  addToCart,
  getCart,
  clearCart,
  updateClientDni,
  placeOrder,
  dispatchOrder,
}) {
  const commandDispatcher = {
    Ping: createHandlePingCommand({ publishStreamEvent }),
    GetClientByPhone: createHandleGetClientByPhoneCommand({
      publishStreamEvent,
      getClientByPhone,
    }),
    RegisterClient: createHandleRegisterClientCommand({
      publishStreamEvent,
      registerClient,
    }),
    GetProductCatalog: createHandleGetProductCatalogCommand({
      publishStreamEvent,
      getProductCatalog,
    }),
    GetProductById: createHandleGetProductByIdCommand({
      publishStreamEvent,
      getProductById,
    }),
    AddToCart: createHandleAddToCartCommand({
      publishStreamEvent,
      addToCart,
    }),
    GetCart: createHandleGetCartCommand({
      publishStreamEvent,
      getCart,
    }),
    ClearCart: createHandleClearCartCommand({
      publishStreamEvent,
      clearCart,
    }),
    UpdateClientDni: createHandleUpdateClientDniCommand({
      publishStreamEvent,
      updateClientDni,
    }),
    PlaceOrder: createHandlePlaceOrderCommand({
      publishStreamEvent,
      placeOrder,
    }),
    DispatchOrder: createHandleDispatchOrderCommand({
      publishStreamEvent,
      dispatchOrder,
    }),
  };

  return async function dispatchStreamCommand({ fields }) {
    const envelope = parseStreamEnvelope(fields);
    const handler = commandDispatcher[envelope.type];

    if (!handler) {
      throw new UnknownCommandError(envelope.type);
    }

    return handler(envelope);
  };
}

module.exports = { createStreamCommandDispatcher };
