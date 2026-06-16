const { createGetProductCatalog } = require('../../src/modules/ordering/application/getProductCatalog');

describe('getProductCatalog', () => {
  test('returns CatalogLoaded with active products only', async () => {
    const products = [
      { id: 1, nombre: 'Arroz con pollo', precio: '18.50' },
      { id: 2, nombre: 'Lomo saltado', precio: '22.00' },
    ];
    const productRepository = {
      findAllActive: jest.fn().mockResolvedValue(products),
    };

    const getProductCatalog = createGetProductCatalog({ productRepository });
    const result = await getProductCatalog();

    expect(result).toEqual({
      eventType: 'CatalogLoaded',
      payload: { products },
    });
    expect(productRepository.findAllActive).toHaveBeenCalledTimes(1);
  });

  test('returns CatalogLoaded with empty products array when catalog is empty', async () => {
    const productRepository = {
      findAllActive: jest.fn().mockResolvedValue([]),
    };

    const getProductCatalog = createGetProductCatalog({ productRepository });
    const result = await getProductCatalog();

    expect(result).toEqual({
      eventType: 'CatalogLoaded',
      payload: { products: [] },
    });
  });
});
