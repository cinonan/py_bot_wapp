/**
 * @typedef {import('../infrastructure/redis/cartStore').CartStorePort} CartStorePort
 */

/**
 * @param {{ cartStore: CartStorePort }} deps
 */
function createClearCart({ cartStore }) {
  return async function clearCart({ phone }) {
    await cartStore.clear(phone);

    return {
      eventType: 'CartUpdated',
      payload: {
        items: [],
        subtotal: '0.00',
      },
    };
  };
}

module.exports = { createClearCart };
