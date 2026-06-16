const { cartQuantitySchema, parseAddToCartPayload } = require('../../src/modules/ordering/domain/cart/cartSchemas');

describe('cartSchemas', () => {
  test('accepts positive integer quantities', () => {
    expect(cartQuantitySchema.parse(1)).toBe(1);
    expect(cartQuantitySchema.parse(99)).toBe(99);
  });

  test('rejects non-integer quantities', () => {
    expect(() => cartQuantitySchema.parse(1.5)).toThrow();
    expect(() => cartQuantitySchema.parse('2')).toThrow();
  });

  test('rejects zero or negative quantities', () => {
    expect(() => cartQuantitySchema.parse(0)).toThrow();
    expect(() => cartQuantitySchema.parse(-1)).toThrow();
  });

  test('parses AddToCart payload with productId and cantidad only', () => {
    const payload = parseAddToCartPayload({ productId: 3, cantidad: 2 });

    expect(payload).toEqual({ productId: 3, cantidad: 2 });
  });

  test('rejects AddToCart payload with extra price or name fields', () => {
    expect(() =>
      parseAddToCartPayload({ productId: 1, cantidad: 1, precio: '10.00' }),
    ).toThrow();
  });
});
