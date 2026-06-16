const {
  validateCartQuantity,
  parseProvidingMenuChoice,
} = require('../../src/modules/bot-conversation/domain/conversation/validators');
const {
  formatCartSummary,
  formatCartAddedMessage,
} = require('../../src/modules/bot-conversation/domain/conversation/cartFormatting');

describe('cart validators and formatting', () => {
  test('accepts positive integer cart quantities', () => {
    expect(validateCartQuantity('2')).toEqual({ valid: true, value: 2 });
  });

  test('rejects invalid cart quantities', () => {
    expect(validateCartQuantity('0').valid).toBe(false);
    expect(validateCartQuantity('1.5').valid).toBe(false);
    expect(validateCartQuantity('abc').valid).toBe(false);
  });

  test('parses providing menu choices', () => {
    expect(parseProvidingMenuChoice('1')).toBe('1');
    expect(parseProvidingMenuChoice('2')).toBe('2');
    expect(parseProvidingMenuChoice('3')).toBeNull();
  });

  test('formats cart summary and subtotal message', () => {
    const items = [
      {
        productId: 1,
        cantidad: 2,
        precio_unitario: '10.00',
        nombre_producto: 'Arroz',
      },
    ];

    expect(formatCartSummary(items)).toContain('Arroz x2');

    const message = formatCartAddedMessage({
      addedItem: items[0],
      items,
      subtotal: '20.00',
    });

    expect(message).toContain('Subtotal acumulado: *S/ 20.00*');
    expect(message).toContain('1. Ver Menú');
  });
});
