const {
  handleProvidingMenuTurn,
  mapGetCartForConfirmResponse,
  mapCatalogResponse,
} = require('../domain/conversation/flow');

function createHandleProvidingMenuMessage({ sessionStore, streamCommandClient }) {
  return async function handleProvidingMenuMessage({ phone, text, wamid, session }) {
    const transition = handleProvidingMenuTurn(session, text);

    if (transition.shouldLoadCatalog) {
      const response = await streamCommandClient.getProductCatalog({ wamid, phone });
      const catalogTransition = mapCatalogResponse(transition.session, response);
      await sessionStore.set(phone, catalogTransition.session);
      return catalogTransition;
    }

    if (!transition.shouldGetCart) {
      await sessionStore.set(phone, transition.session);
      return transition;
    }

    const response = await streamCommandClient.getCart({ wamid, phone });
    const confirmTransition = mapGetCartForConfirmResponse(transition.session, response);
    await sessionStore.set(phone, confirmTransition.session);
    return confirmTransition;
  };
}

module.exports = { createHandleProvidingMenuMessage };
