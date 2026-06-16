/**
 * @typedef {object} ProductRepositoryPort
 * @property {() => Promise<Array<{ id: number, nombre: string, precio: string }>>} findAllActive
 */

/**
 * @param {{ productRepository: ProductRepositoryPort }} deps
 */
function createGetProductCatalog({ productRepository }) {
  return async function getProductCatalog() {
    const products = await productRepository.findAllActive();

    return {
      eventType: 'CatalogLoaded',
      payload: { products },
    };
  };
}

module.exports = { createGetProductCatalog };
