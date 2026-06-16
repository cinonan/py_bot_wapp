const { handleAwaitingCatalogTurn, mapCatalogResponse } = require('../domain/conversation/flow');

function createHandleAwaitingCatalogMessage({ sessionStore, streamCommandClient }) {
  return async function handleAwaitingCatalogMessage({ phone, text, wamid, session }) {
    const transition = handleAwaitingCatalogTurn(session, text);

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

module.exports = { createHandleAwaitingCatalogMessage };
