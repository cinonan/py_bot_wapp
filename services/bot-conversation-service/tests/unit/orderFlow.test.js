const { CONVERSATION_STATE } = require('../../src/modules/bot-conversation/domain/conversation/states');
const {
  handleConfirmingOrderTurn,
  mapPlaceOrderResponse,
  formatOrderSummaryMessage,
} = require('../../src/modules/bot-conversation/domain/conversation/flow');
const { parseDniResponse } = require('../../src/modules/bot-conversation/domain/conversation/validators');

describe('order confirmation flow', () => {
  const baseSession = {
    state: CONVERSATION_STATE.CONFIRMING_ORDER,
    metadata: {
      name: 'María',
      direccionEntrega: 'Av. Lima 123',
      addressConfirmed: true,
    },
  };

  test('order summary includes cart lines and DNI prompt', () => {
    const message = formatOrderSummaryMessage({
      items: [{
        productId: 1,
        cantidad: 2,
        precio_unitario: '10.00',
        nombre_producto: 'Arroz',
      }],
      subtotal: '20.00',
      direccionEntrega: 'Av. Lima 123',
    });

    expect(message).toContain('Arroz x2');
    expect(message).toContain('S/ 20.00');
    expect(message).toContain('8 dígitos');
  });

  test('parseDniResponse accepts skip and valid dni', () => {
    expect(parseDniResponse('No')).toEqual({ kind: 'skip' });
    expect(parseDniResponse('12345678')).toEqual({ kind: 'dni', value: '12345678' });
    expect(parseDniResponse('123')).toEqual({ kind: 'invalid' });
  });

  test('handleConfirmingOrderTurn prepares PlaceOrder payload without dni on skip', () => {
    const transition = handleConfirmingOrderTurn(baseSession, 'No');

    expect(transition.shouldPlaceOrder).toBe(true);
    expect(transition.placeOrderPayload).toEqual({
      direccion_entrega: 'Av. Lima 123',
    });
    expect(transition.shouldUpdateClientDni).toBeUndefined();
  });

  test('handleConfirmingOrderTurn includes dni_facturacion when provided', () => {
    const transition = handleConfirmingOrderTurn(baseSession, '87654321');

    expect(transition.shouldPlaceOrder).toBe(true);
    expect(transition.placeOrderPayload).toEqual({
      direccion_entrega: 'Av. Lima 123',
      dni_facturacion: '87654321',
    });
    expect(transition.shouldUpdateClientDni).toBe(true);
    expect(transition.dni).toBe('87654321');
  });

  test('mapPlaceOrderResponse clears session and notifies admin', () => {
    const transition = mapPlaceOrderResponse(baseSession, {
      type: 'OrderPlaced',
      payload: JSON.stringify({
        order: {
          id: 99,
          total: '20.00',
          estado: 'pendiente',
          direccion_entrega: 'Av. Lima 123',
          dni_facturacion: null,
          items: [{
            productId: 1,
            cantidad: 2,
            precio_unitario: '10.00',
            nombre_producto: 'Arroz',
          }],
        },
        client: {
          id: 1,
          nombre: 'María',
          telefono: '51999007009',
        },
      }),
    }, {
      adminOrderNotifyPhone: '51999000001',
      customerPhone: '51999007009',
    });

    expect(transition.session).toBeNull();
    expect(transition.replies[0]).toContain('Pedido #99');
    expect(transition.replies[0]).toContain('S/ 20.00');
    expect(transition.notifications[0].phone).toBe('51999000001');
    expect(transition.notifications[0].text).toContain('María');
    expect(transition.notifications[0].text).toContain('Arroz x2');
  });
});
