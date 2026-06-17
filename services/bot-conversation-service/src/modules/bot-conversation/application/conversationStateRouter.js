const { CONVERSATION_STATE } = require('../domain/conversation/states');
const { createHandleFirstConversationMessage } = require('./handleFirstConversationMessage');
const { createHandleAwaitingRegistrationNameMessage } = require('./handleAwaitingRegistrationNameMessage');
const { createHandleAwaitingRegistrationAddressMessage } = require('./handleAwaitingRegistrationAddressMessage');
const { createHandleConfirmingAddressMessage } = require('./handleConfirmingAddressMessage');
const { createHandleAwaitingCatalogMessage } = require('./handleAwaitingCatalogMessage');
const { createHandleSelectingProductMessage } = require('./handleSelectingProductMessage');
const { createHandleAwaitingQuantityMessage } = require('./handleAwaitingQuantityMessage');
const { createHandleProvidingMenuMessage } = require('./handleProvidingMenuMessage');
const { createHandleAwaitingDeliveryAddressMessage } = require('./handleAwaitingDeliveryAddressMessage');
const { createHandleConfirmingOrderMessage } = require('./handleConfirmingOrderMessage');

function createConversationStateRouter({ sessionStore, streamCommandClient, adminOrderNotifyPhone }) {
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
      streamCommandClient,
    }),
    [CONVERSATION_STATE.AWAITING_CATALOG]: createHandleAwaitingCatalogMessage({
      sessionStore,
      streamCommandClient,
    }),
    [CONVERSATION_STATE.SELECTING_PRODUCT]: createHandleSelectingProductMessage({
      sessionStore,
      streamCommandClient,
    }),
    [CONVERSATION_STATE.AWAITING_QUANTITY]: createHandleAwaitingQuantityMessage({
      sessionStore,
      streamCommandClient,
    }),
    [CONVERSATION_STATE.PROVIDING_MENU]: createHandleProvidingMenuMessage({
      sessionStore,
      streamCommandClient,
    }),
    [CONVERSATION_STATE.AWAITING_DELIVERY_ADDRESS]: createHandleAwaitingDeliveryAddressMessage({
      sessionStore,
      streamCommandClient,
    }),
    [CONVERSATION_STATE.CONFIRMING_ORDER]: createHandleConfirmingOrderMessage({
      sessionStore,
      streamCommandClient,
      adminOrderNotifyPhone,
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
