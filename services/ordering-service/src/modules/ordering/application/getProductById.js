/**
 * @typedef {object} ProductRepositoryPort
 * @property {(productId: number) => Promise<{ id: number, nombre: string, precio: string }|null>} findActiveById
 */

/**
 * @param {{ productRepository: ProductRepositoryPort }} deps
 */
function createGetProductById({ productRepository }) {
  return async function getProductById({ productId }) {
    const product = await productRepository.findActiveById(productId);

    if (product) {
      return {
        eventType: 'ProductResolved',
        payload: { product },
      };
    }

    return {
      eventType: 'ProductNotFound',
      payload: {},
    };
  };
}

module.exports = { createGetProductById };
