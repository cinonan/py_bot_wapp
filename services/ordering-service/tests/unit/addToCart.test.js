const { createAddToCart } = require('../../src/modules/ordering/application/addToCart');
const { createGetCart } = require('../../src/modules/ordering/application/getCart');
const { createClearCart } = require('../../src/modules/ordering/application/clearCart');

describe('addToCart', () => {
  test('freezes product snapshot from repository and merges quantities', async () => {
    const product = { id: 1, nombre: 'Arroz', precio: '10.00' };
    const cartStore = {
      getItems: jest.fn().mockResolvedValue([
        { productId: 1, cantidad: 1, precio_unitario: '10.00', nombre_producto: 'Arroz' },
      ]),
      saveItems: jest.fn().mockResolvedValue(undefined),
    };
    const productRepository = {
      findActiveById: jest.fn().mockResolvedValue(product),
    };

    const addToCart = createAddToCart({ cartStore, productRepository });
    const result = await addToCart({ phone: '51999001001', productId: 1, cantidad: 2 });

    expect(productRepository.findActiveById).toHaveBeenCalledWith(1);
    expect(cartStore.saveItems).toHaveBeenCalledWith('51999001001', [
      { productId: 1, cantidad: 3, precio_unitario: '10.00', nombre_producto: 'Arroz' },
    ]);
    expect(result.eventType).toBe('CartUpdated');
    expect(result.payload.subtotal).toBe('30.00');
    expect(result.payload.items[0].precio_unitario).toBe('10.00');
  });

  test('returns AddToCartFailed when product is not found', async () => {
    const cartStore = {
      getItems: jest.fn().mockResolvedValue([]),
      saveItems: jest.fn(),
    };
    const productRepository = {
      findActiveById: jest.fn().mockResolvedValue(null),
    };

    const addToCart = createAddToCart({ cartStore, productRepository });
    const result = await addToCart({ phone: '51999001001', productId: 99, cantidad: 1 });

    expect(result.eventType).toBe('AddToCartFailed');
    expect(cartStore.saveItems).not.toHaveBeenCalled();
  });
});

describe('getCart', () => {
  test('returns CartUpdated with current items and subtotal', async () => {
    const items = [
      { productId: 2, cantidad: 1, precio_unitario: '15.50', nombre_producto: 'Pollo' },
    ];
    const cartStore = {
      getItems: jest.fn().mockResolvedValue(items),
    };

    const getCart = createGetCart({ cartStore });
    const result = await getCart({ phone: '51999001001' });

    expect(result).toEqual({
      eventType: 'CartUpdated',
      payload: { items, subtotal: '15.50' },
    });
  });
});

describe('clearCart', () => {
  test('clears cart and returns empty CartUpdated', async () => {
    const cartStore = {
      clear: jest.fn().mockResolvedValue(undefined),
    };

    const clearCart = createClearCart({ cartStore });
    const result = await clearCart({ phone: '51999001001' });

    expect(cartStore.clear).toHaveBeenCalledWith('51999001001');
    expect(result).toEqual({
      eventType: 'CartUpdated',
      payload: { items: [], subtotal: '0.00' },
    });
  });
});
