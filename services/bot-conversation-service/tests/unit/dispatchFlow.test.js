const {
  mapDispatchOrderResponse,
  MESSAGES,
} = require('../../src/modules/bot-conversation/domain/conversation/flow');

describe('admin dispatch flow', () => {
  test('mapDispatchOrderResponse notifies customer and confirms to admin on success', () => {
    const transition = mapDispatchOrderResponse({
      type: 'OrderDispatched',
      payload: JSON.stringify({
        order: {
          id: 55,
          total: '30.00',
          estado: 'en_camino',
          direccion_entrega: 'Av. Lima 123',
          fecha_atencion: '2026-06-16T12:00:00.000Z',
        },
        client: {
          id: 1,
          nombre: 'María',
          telefono: '51999007009',
        },
      }),
    }, 55);

    expect(transition.replies[0]).toContain('pedido #55');
    expect(transition.replies[0]).toContain('en camino');
    expect(transition.notifications[0].phone).toBe('51999007009');
    expect(transition.notifications[0].text).toContain('en camino');
  });

  test('mapDispatchOrderResponse returns descriptive error for invalid state', () => {
    const transition = mapDispatchOrderResponse({
      type: 'OrderDispatchFailed',
      payload: JSON.stringify({
        reason: 'invalid_state',
        currentState: 'entregado',
      }),
    }, 77);

    expect(transition.replies[0]).toContain('pedido #77');
    expect(transition.replies[0]).toContain('entregado');
    expect(transition.replies[0]).toContain('pendientes');
  });

  test('mapDispatchOrderResponse returns not found message', () => {
    const transition = mapDispatchOrderResponse({
      type: 'OrderDispatchFailed',
      payload: JSON.stringify({ reason: 'order_not_found' }),
    }, 404);

    expect(transition.replies[0]).toContain('No encontré el pedido #404');
  });
});

describe('handleAdminDispatchMessage authorization', () => {
  const { createHandleAdminDispatchMessage } = require('../../src/modules/bot-conversation/application/handleAdminDispatchMessage');

  test('rejects unauthorized phone before calling ordering service', async () => {
    const streamCommandClient = {
      dispatchOrder: jest.fn(),
    };
    const handleAdminDispatchMessage = createHandleAdminDispatchMessage({
      streamCommandClient,
      adminOrderNotifyPhone: '51999000001',
    });

    const result = await handleAdminDispatchMessage({
      phone: '51999099999',
      wamid: 'wamid.unauthorized',
      orderId: 10,
    });

    expect(result.replies[0]).toBe(MESSAGES.dispatchUnauthorized);
    expect(streamCommandClient.dispatchOrder).not.toHaveBeenCalled();
  });
});
