const {
  handleAwaitingQuantityTurn,
  mapAddToCartResponse,
  mapCatalogResponse,
} = require('../domain/conversation/flow');

function createHandleAwaitingQuantityMessage({ sessionStore, streamCommandClient }) {
  return async function handleAwaitingQuantityMessage({ phone, text, wamid, session }) {
    const transition = handleAwaitingQuantityTurn(session, text);

    if (transition.shouldLoadCatalog) {
      const response = await streamCommandClient.getProductCatalog({ wamid, phone });
      const catalogTransition = mapCatalogResponse(transition.session, response);
      await sessionStore.set(phone, catalogTransition.session);
      return catalogTransition;
    }

    if (!transition.shouldAddToCart) {
      await sessionStore.set(phone, transition.session);
      return transition;
    }

    const response = await streamCommandClient.addToCart({
      wamid,
      phone,
      productId: transition.addToCartPayload.productId,
      cantidad: transition.addToCartPayload.cantidad,
    });
    const cartTransition = mapAddToCartResponse(
      transition.session,
      response,
      transition.addToCartPayload,
    );
    await sessionStore.set(phone, cartTransition.session);
    return cartTransition;
  };
}

module.exports = { createHandleAwaitingQuantityMessage };
