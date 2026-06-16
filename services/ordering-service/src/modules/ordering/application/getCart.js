const { calculateSubtotal } = require('../domain/cart/cart');

/**
 * @typedef {import('../infrastructure/redis/cartStore').CartStorePort} CartStorePort
 */

/**
 * @param {{ cartStore: CartStorePort }} deps
 */
function createGetCart({ cartStore }) {
  return async function getCart({ phone }) {
    const items = await cartStore.getItems(phone);

    return {
      eventType: 'CartUpdated',
      payload: {
        items,
        subtotal: calculateSubtotal(items),
      },
    };
  };
}

module.exports = { createGetCart };
