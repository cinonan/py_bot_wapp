const { CONVERSATION_STATE } = require('../../src/modules/bot-conversation/domain/conversation/states');
const {
  handleConfirmingAddressTurn,
  mapGetCartForConfirmResponse,
  handleAwaitingDeliveryAddressTurn,
  mapDeliveryAddressConfirmResponse,
} = require('../../src/modules/bot-conversation/domain/conversation/flow');
const { validateDeliveryAddress } = require('../../src/modules/bot-conversation/domain/conversation/validators');

describe('delivery address resolution', () => {
  const baseSession = {
    state: CONVERSATION_STATE.CONFIRMING_ADDRESS,
    metadata: { name: 'Ana', savedAddress: 'Calle Guardada 10' },
  };

  test('MISMA resolves direccionEntrega from saved profile address', () => {
    const transition = handleConfirmingAddressTurn(baseSession, 'MISMA');

    expect(transition.session.metadata.deliveryAddressChoice).toBe('misma');
    expect(transition.session.metadata.direccionEntrega).toBe('Calle Guardada 10');
    expect(transition.session.metadata.addressConfirmed).toBe(true);
    expect(transition.replies[0]).toContain('dirección guardada');
  });

  test('NUEVA defers capture without setting direccionEntrega', () => {
    const transition = handleConfirmingAddressTurn(baseSession, 'nueva');

    expect(transition.session.metadata.deliveryAddressChoice).toBe('nueva');
    expect(transition.session.metadata.direccionEntrega).toBeUndefined();
    expect(transition.session.metadata.addressConfirmed).toBe(true);
    expect(transition.replies[0]).toContain('dirección nueva');
  });

  test('MISMA checkout advances to confirming order with cart intact', () => {
    const session = {
      state: CONVERSATION_STATE.PROVIDING_MENU,
      metadata: {
        ...baseSession.metadata,
        deliveryAddressChoice: 'misma',
        direccionEntrega: 'Calle Guardada 10',
        addressConfirmed: true,
      },
    };

    const transition = mapGetCartForConfirmResponse(session, {
      type: 'CartUpdated',
      payload: JSON.stringify({
        items: [{ productId: 1, cantidad: 1, precio_unitario: '10.00', nombre_producto: 'Arroz' }],
        subtotal: '10.00',
      }),
    });

    expect(transition.session.state).toBe(CONVERSATION_STATE.CONFIRMING_ORDER);
    expect(transition.session.metadata.direccionEntrega).toBe('Calle Guardada 10');
    expect(transition.replies[0]).toContain('Calle Guardada 10');
    expect(transition.replies[0]).toContain('Arroz');
  });

  test('NUEVA checkout requests delivery address before confirming order', () => {
    const session = {
      state: CONVERSATION_STATE.PROVIDING_MENU,
      metadata: {
        ...baseSession.metadata,
        deliveryAddressChoice: 'nueva',
        addressConfirmed: true,
      },
    };

    const transition = mapGetCartForConfirmResponse(session, {
      type: 'CartUpdated',
      payload: JSON.stringify({
        items: [{ productId: 1, cantidad: 1, precio_unitario: '10.00', nombre_producto: 'Arroz' }],
        subtotal: '10.00',
      }),
    });

    expect(transition.session.state).toBe(CONVERSATION_STATE.AWAITING_DELIVERY_ADDRESS);
    expect(transition.session.metadata.direccionEntrega).toBeUndefined();
    expect(transition.replies[0]).toContain('dirección de entrega');
  });

  test('invalid delivery address keeps awaiting state without clearing cart flag', () => {
    const session = {
      state: CONVERSATION_STATE.AWAITING_DELIVERY_ADDRESS,
      metadata: {
        deliveryAddressChoice: 'nueva',
        addressConfirmed: true,
      },
    };

    const transition = handleAwaitingDeliveryAddressTurn(session, '   ');

    expect(transition.session.state).toBe(CONVERSATION_STATE.AWAITING_DELIVERY_ADDRESS);
    expect(transition.shouldGetCartForSummary).toBeUndefined();
    expect(transition.replies[0]).toContain('vacía');
  });

  test('valid delivery address stores direccionEntrega and requests order summary', () => {
    const session = {
      state: CONVERSATION_STATE.AWAITING_DELIVERY_ADDRESS,
      metadata: {
        deliveryAddressChoice: 'nueva',
        addressConfirmed: true,
      },
    };

    const transition = handleAwaitingDeliveryAddressTurn(session, 'Av. Nueva 456, Lima');

    expect(transition.session.metadata.direccionEntrega).toBe('Av. Nueva 456, Lima');
    expect(transition.shouldGetCartForSummary).toBe(true);
  });

  test('captured delivery address advances to confirming order with summary', () => {
    const session = {
      state: CONVERSATION_STATE.AWAITING_DELIVERY_ADDRESS,
      metadata: {
        deliveryAddressChoice: 'nueva',
        direccionEntrega: 'Av. Nueva 456, Lima',
        addressConfirmed: true,
      },
    };

    const transition = mapDeliveryAddressConfirmResponse(session, {
      type: 'CartUpdated',
      payload: JSON.stringify({
        items: [{ productId: 1, cantidad: 2, precio_unitario: '10.00', nombre_producto: 'Arroz' }],
        subtotal: '20.00',
      }),
    });

    expect(transition.session.state).toBe(CONVERSATION_STATE.CONFIRMING_ORDER);
    expect(transition.replies[0]).toContain('Av. Nueva 456, Lima');
    expect(transition.replies[0]).toContain('Arroz x2');
  });

  test('validateDeliveryAddress reuses delivery address rules', () => {
    expect(validateDeliveryAddress('abc').valid).toBe(false);
    expect(validateDeliveryAddress('Av. Entrega 99')).toEqual({
      valid: true,
      value: 'Av. Entrega 99',
    });
  });
});
