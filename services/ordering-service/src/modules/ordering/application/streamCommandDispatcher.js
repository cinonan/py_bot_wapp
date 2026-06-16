const { parseStreamEnvelope } = require('../domain/messaging/messageSchemas');
const { createPublishStreamEvent } = require('./publishStreamEvent');
const { createHandlePingCommand } = require('./handlePingCommand');
const { createHandleGetClientByPhoneCommand } = require('./handleGetClientByPhoneCommand');
const { createHandleRegisterClientCommand } = require('./handleRegisterClientCommand');

function createStreamCommandDispatcher({ eventPublisher, getClientByPhone, registerClient }) {
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
  };

  return async function dispatchStreamCommand({ fields }) {
    const envelope = parseStreamEnvelope(fields);
    const handler = commandDispatcher[envelope.type];

    if (!handler) {
      throw new Error(`Unknown command type: ${envelope.type}`);
    }

    return handler(envelope);
  };
}

module.exports = { createStreamCommandDispatcher };
