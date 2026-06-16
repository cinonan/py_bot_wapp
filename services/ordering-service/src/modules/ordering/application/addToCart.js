const { mergeCartItem, calculateSubtotal } = require('../domain/cart/cart');

/**
 * @typedef {import('../infrastructure/redis/cartStore').CartStorePort} CartStorePort
 * @typedef {import('../infrastructure/postgres/productRepository').ProductRepositoryPort} ProductRepositoryPort
 */

/**
 * @param {{ cartStore: CartStorePort, productRepository: ProductRepositoryPort }} deps
 */
function createAddToCart({ cartStore, productRepository }) {
  return async function addToCart({ phone, productId, cantidad }) {
    const product = await productRepository.findActiveById(productId);

    if (!product) {
      return {
        eventType: 'AddToCartFailed',
        payload: { reason: 'product_not_found' },
      };
    }

    const existingItems = await cartStore.getItems(phone);
    const snapshotItem = {
      productId: product.id,
      cantidad,
      precio_unitario: product.precio,
      nombre_producto: product.nombre,
    };
    const items = mergeCartItem(existingItems, snapshotItem);

    await cartStore.saveItems(phone, items);

    return {
      eventType: 'CartUpdated',
      payload: {
        items,
        subtotal: calculateSubtotal(items),
      },
    };
  };
}

module.exports = { createAddToCart };
