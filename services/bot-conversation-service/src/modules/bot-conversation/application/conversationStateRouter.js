const { CONVERSATION_STATE } = require('../domain/conversation/states');
const { createHandleFirstConversationMessage } = require('./handleFirstConversationMessage');
const { createHandleAwaitingRegistrationNameMessage } = require('./handleAwaitingRegistrationNameMessage');
const { createHandleAwaitingRegistrationAddressMessage } = require('./handleAwaitingRegistrationAddressMessage');
const { createHandleConfirmingAddressMessage } = require('./handleConfirmingAddressMessage');

function createConversationStateRouter({ sessionStore, streamCommandClient }) {
  const stateHandlers = {
    [CONVERSATION_STATE.AWAITING_REGISTRATION_NAME]: createHandleAwaitingRegistrationNameMessage({
      sessionStore,
    }),
    [CONVERSATION_STATE.AWAITING_REGISTRATION_ADDRESS]: createHandleAwaitingRegistrationAddressMessage({
      sessionStore,
      streamCommandClient,
    }),
    [CONVERSATION_STATE.CONFIRMING_ADDRESS]: createHandleConfirmingAddressMessage({
      sessionStore,
    }),
  };

  const handleFirstConversationMessage = createHandleFirstConversationMessage({
    sessionStore,
    streamCommandClient,
  });

  return async function routeConversationMessage({ phone, text, wamid, session }) {
    if (!session) {
      return handleFirstConversationMessage({ phone, text, wamid });
    }

    const handler = stateHandlers[session.state];
    if (!handler) {
      return {
        replies: ['Estado no reconocido. Envía cualquier mensaje para reiniciar.'],
        session: null,
      };
    }

    return handler({ phone, text, wamid, session });
  };
}

module.exports = { createConversationStateRouter };
