const { parsePlaceOrderPayload } = require('../../src/modules/ordering/domain/order/placeOrderSchema');
const { parseUpdateClientDniPayload } = require('../../src/modules/ordering/domain/client/updateClientDniSchema');

describe('placeOrderSchema', () => {
  test('requires direccion_entrega with minimum length', () => {
    expect(() => parsePlaceOrderPayload({ direccion_entrega: 'abc' })).toThrow();
    expect(parsePlaceOrderPayload({ direccion_entrega: 'Av. Lima 123' })).toEqual({
      direccion_entrega: 'Av. Lima 123',
    });
  });

  test('accepts optional dni_facturacion with exactly 8 digits', () => {
    expect(parsePlaceOrderPayload({
      direccion_entrega: 'Av. Lima 123',
      dni_facturacion: '12345678',
    })).toEqual({
      direccion_entrega: 'Av. Lima 123',
      dni_facturacion: '12345678',
    });

    expect(() => parsePlaceOrderPayload({
      direccion_entrega: 'Av. Lima 123',
      dni_facturacion: '1234',
    })).toThrow();
  });
});

describe('updateClientDniSchema', () => {
  test('requires exactly 8 digit dni', () => {
    expect(parseUpdateClientDniPayload({ dni: '12345678' })).toEqual({ dni: '12345678' });
    expect(() => parseUpdateClientDniPayload({ dni: '123' })).toThrow();
  });
});
