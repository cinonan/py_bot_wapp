const { handleSelectingProductTurn, mapProductLookupResponse } = require('../domain/conversation/flow');

function createHandleSelectingProductMessage({ sessionStore, streamCommandClient }) {
  return async function handleSelectingProductMessage({ phone, text, wamid, session }) {
    const transition = handleSelectingProductTurn(session, text);

    if (!transition.shouldLookupProduct) {
      if (transition.shouldLoadCatalog) {
        const response = await streamCommandClient.getProductCatalog({ wamid, phone });
        const catalogTransition = mapCatalogResponse(transition.session, response);
        await sessionStore.set(phone, catalogTransition.session);
        return catalogTransition;
      }

      await sessionStore.set(phone, transition.session);
      return transition;
    }

    const response = await streamCommandClient.getProductById({
      wamid,
      phone,
      productId: transition.productId,
    });
    const productTransition = mapProductLookupResponse(
      transition.session,
      response,
      transition.productId,
    );
    await sessionStore.set(phone, productTransition.session);
    return productTransition;
  };
}

module.exports = { createHandleSelectingProductMessage };
