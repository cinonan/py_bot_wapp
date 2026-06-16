const { createGetProductById } = require('../../src/modules/ordering/application/getProductById');

describe('getProductById', () => {
  test('returns ProductResolved when active product exists', async () => {
    const product = { id: 3, nombre: 'Ají de gallina', precio: '16.00' };
    const productRepository = {
      findActiveById: jest.fn().mockResolvedValue(product),
    };

    const getProductById = createGetProductById({ productRepository });
    const result = await getProductById({ productId: 3 });

    expect(result).toEqual({
      eventType: 'ProductResolved',
      payload: { product },
    });
    expect(productRepository.findActiveById).toHaveBeenCalledWith(3);
  });

  test('returns ProductNotFound when product is missing or inactive', async () => {
    const productRepository = {
      findActiveById: jest.fn().mockResolvedValue(null),
    };

    const getProductById = createGetProductById({ productRepository });
    const result = await getProductById({ productId: 99 });

    expect(result).toEqual({
      eventType: 'ProductNotFound',
      payload: {},
    });
  });
});
