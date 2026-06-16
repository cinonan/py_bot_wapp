const { mergeCartItem, calculateSubtotal } = require('../../src/modules/ordering/domain/cart/cart');

describe('cart domain', () => {
  test('merges quantities when same productId is added twice', () => {
    const existing = [
      {
        productId: 1,
        cantidad: 2,
        precio_unitario: '10.00',
        nombre_producto: 'Arroz',
      },
    ];
    const incoming = {
      productId: 1,
      cantidad: 3,
      precio_unitario: '10.00',
      nombre_producto: 'Arroz',
    };

    const merged = mergeCartItem(existing, incoming);

    expect(merged).toHaveLength(1);
    expect(merged[0].cantidad).toBe(5);
    expect(merged[0].precio_unitario).toBe('10.00');
  });

  test('appends new product when productId differs', () => {
    const existing = [
      {
        productId: 1,
        cantidad: 1,
        precio_unitario: '10.00',
        nombre_producto: 'Arroz',
      },
    ];
    const incoming = {
      productId: 2,
      cantidad: 2,
      precio_unitario: '15.50',
      nombre_producto: 'Pollo',
    };

    const merged = mergeCartItem(existing, incoming);

    expect(merged).toHaveLength(2);
    expect(merged[1]).toEqual(incoming);
  });

  test('calculates subtotal from item snapshots', () => {
    const items = [
      { productId: 1, cantidad: 2, precio_unitario: '10.00', nombre_producto: 'Arroz' },
      { productId: 2, cantidad: 1, precio_unitario: '15.50', nombre_producto: 'Pollo' },
    ];

    expect(calculateSubtotal(items)).toBe('35.50');
  });

  test('returns zero subtotal for empty cart', () => {
    expect(calculateSubtotal([])).toBe('0.00');
  });
});
