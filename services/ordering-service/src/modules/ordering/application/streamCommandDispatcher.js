const { parseStreamEnvelope } = require('../domain/messaging/messageSchemas');
const { UnknownCommandError } = require('../domain/messaging/streamErrorClassification');
const { createPublishStreamEvent } = require('./publishStreamEvent');
const { createHandlePingCommand } = require('./handlePingCommand');
const { createHandleGetClientByPhoneCommand } = require('./handleGetClientByPhoneCommand');
const { createHandleRegisterClientCommand } = require('./handleRegisterClientCommand');
const { createHandleGetProductCatalogCommand } = require('./handleGetProductCatalogCommand');
const { createHandleGetProductByIdCommand } = require('./handleGetProductByIdCommand');

function createStreamCommandDispatcher({
  eventPublisher,
  getClientByPhone,
  registerClient,
  getProductCatalog,
  getProductById,
}) {
  const publishStreamEvent = createPublishStreamEvent(eventPublisher);

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
