const {
  handleConfirmingAddressTurn,
  mapCatalogResponse,
} = require('../domain/conversation/flow');

function createHandleConfirmingAddressMessage({ sessionStore, streamCommandClient }) {
  return async function handleConfirmingAddressMessage({ phone, text, wamid, session }) {
    const transition = handleConfirmingAddressTurn(session, text);

    if (transition.shouldLoadCatalog) {
      const response = await streamCommandClient.getProductCatalog({ wamid, phone });
      const catalogTransition = mapCatalogResponse(transition.session, response);
      await sessionStore.set(phone, catalogTransition.session);
      return catalogTransition;
    }

    await sessionStore.set(phone, transition.session);
    return transition;
  };
}

module.exports = { createHandleConfirmingAddressMessage };
