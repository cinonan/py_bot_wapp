const { createDispatchOrder } = require('../../src/modules/ordering/application/dispatchOrder');

describe('dispatchOrder', () => {
  test('transitions pendiente order to en_camino and returns OrderDispatched', async () => {
    const dispatchedOrder = {
      id: 42,
      total: '20.00',
      estado: 'en_camino',
      direccion_entrega: 'Av. Entrega 200',
      fecha_atencion: '2026-06-16T12:00:00.000Z',
    };
    const client = {
      id: 5,
      nombre: 'Cliente Test',
      telefono: '51999001005',
    };

    const orderRepository = {
      dispatchFromPendiente: jest.fn().mockResolvedValue({
        ok: true,
        order: dispatchedOrder,
        client,
      }),
    };

    const dispatchOrder = createDispatchOrder({ orderRepository });
    const result = await dispatchOrder({
      payloadJson: JSON.stringify({ orderId: 42 }),
    });

    expect(orderRepository.dispatchFromPendiente).toHaveBeenCalledWith(42);
    expect(result).toEqual({
      eventType: 'OrderDispatched',
      payload: {
        order: {
          id: 42,
          total: '20.00',
          estado: 'en_camino',
          direccion_entrega: 'Av. Entrega 200',
          fecha_atencion: dispatchedOrder.fecha_atencion,
        },
        client,
      },
    });
  });

  test('returns OrderDispatchFailed when order does not exist', async () => {
    const orderRepository = {
      dispatchFromPendiente: jest.fn().mockResolvedValue({ ok: false, reason: 'order_not_found' }),
    };

    const dispatchOrder = createDispatchOrder({ orderRepository });
    const result = await dispatchOrder({
      payloadJson: JSON.stringify({ orderId: 99 }),
    });

    expect(result).toEqual({
      eventType: 'OrderDispatchFailed',
      payload: { reason: 'order_not_found' },
    });
  });

  test('returns OrderDispatchFailed when order is not pendiente', async () => {
    const orderRepository = {
      dispatchFromPendiente: jest.fn().mockResolvedValue({
        ok: false,
        reason: 'invalid_state',
        currentState: 'en_camino',
      }),
    };

    const dispatchOrder = createDispatchOrder({ orderRepository });
    const result = await dispatchOrder({
      payloadJson: JSON.stringify({ orderId: 10 }),
    });

    expect(result).toEqual({
      eventType: 'OrderDispatchFailed',
      payload: { reason: 'invalid_state', currentState: 'en_camino' },
    });
  });
});
