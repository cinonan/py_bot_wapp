const { createPlaceOrder } = require('../../src/modules/ordering/application/placeOrder');

describe('placeOrder', () => {
  const cartItems = [
    {
      productId: 1,
      cantidad: 2,
      precio_unitario: '10.00',
      nombre_producto: 'Arroz',
    },
  ];

  test('persists order from cart snapshots and clears cart', async () => {
    const client = {
      id: 5,
      telefono: '51999001005',
      nombre: 'Cliente Test',
      direccion_principal: 'Av. Principal 100',
      dni: null,
    };
    const createdOrder = {
      id: 42,
      cliente_id: 5,
      total: '20.00',
      estado: 'pendiente',
      direccion_entrega: 'Av. Entrega 200',
      dni_facturacion: '12345678',
    };

    const cartStore = {
      getItems: jest.fn().mockResolvedValue(cartItems),
      clear: jest.fn().mockResolvedValue(undefined),
    };
    const clientRepository = {
      findByPhone: jest.fn().mockResolvedValue(client),
    };
    const orderRepository = {
      createWithDetails: jest.fn().mockResolvedValue(createdOrder),
    };

    const placeOrder = createPlaceOrder({ cartStore, clientRepository, orderRepository });
    const result = await placeOrder({
      phone: '51999001005',
      payloadJson: JSON.stringify({
        direccion_entrega: 'Av. Entrega 200',
        dni_facturacion: '12345678',
      }),
    });

    expect(orderRepository.createWithDetails).toHaveBeenCalledWith({
      clienteId: 5,
      direccion_entrega: 'Av. Entrega 200',
      dni_facturacion: '12345678',
      total: '20.00',
      items: cartItems,
    });
    expect(cartStore.clear).toHaveBeenCalledWith('51999001005');
    expect(result).toEqual({
      eventType: 'OrderPlaced',
      payload: {
        order: {
          id: 42,
          total: '20.00',
          estado: 'pendiente',
          direccion_entrega: 'Av. Entrega 200',
          dni_facturacion: '12345678',
          items: cartItems,
        },
        client: {
          id: 5,
          nombre: 'Cliente Test',
          telefono: '51999001005',
        },
      },
    });
  });

  test('returns OrderPlaceFailed when cart is empty', async () => {
    const cartStore = {
      getItems: jest.fn().mockResolvedValue([]),
      clear: jest.fn(),
    };
    const clientRepository = { findByPhone: jest.fn() };
    const orderRepository = { createWithDetails: jest.fn() };

    const placeOrder = createPlaceOrder({ cartStore, clientRepository, orderRepository });
    const result = await placeOrder({
      phone: '51999001005',
      payloadJson: JSON.stringify({ direccion_entrega: 'Av. Entrega 200' }),
    });

    expect(result).toEqual({
      eventType: 'OrderPlaceFailed',
      payload: { reason: 'empty_cart' },
    });
    expect(orderRepository.createWithDetails).not.toHaveBeenCalled();
  });

  test('returns OrderPlaceFailed when client is not registered', async () => {
    const cartStore = {
      getItems: jest.fn().mockResolvedValue(cartItems),
      clear: jest.fn(),
    };
    const clientRepository = {
      findByPhone: jest.fn().mockResolvedValue(null),
    };
    const orderRepository = { createWithDetails: jest.fn() };

    const placeOrder = createPlaceOrder({ cartStore, clientRepository, orderRepository });
    const result = await placeOrder({
      phone: '51999001005',
      payloadJson: JSON.stringify({ direccion_entrega: 'Av. Entrega 200' }),
    });

    expect(result).toEqual({
      eventType: 'OrderPlaceFailed',
      payload: { reason: 'client_not_found' },
    });
  });
});
