const {
  handleAwaitingDeliveryAddressTurn,
  mapDeliveryAddressConfirmResponse,
} = require('../domain/conversation/flow');

function createHandleAwaitingDeliveryAddressMessage({ sessionStore, streamCommandClient }) {
  return async function handleAwaitingDeliveryAddressMessage({ phone, text, wamid, session }) {
    const transition = handleAwaitingDeliveryAddressTurn(session, text);

    if (!transition.shouldGetCartForSummary) {
      await sessionStore.set(phone, transition.session);
      return transition;
    }

    const response = await streamCommandClient.getCart({ wamid, phone });
    const confirmTransition = mapDeliveryAddressConfirmResponse(transition.session, response);
    await sessionStore.set(phone, confirmTransition.session);
    return confirmTransition;
  };
}

module.exports = { createHandleAwaitingDeliveryAddressMessage };
