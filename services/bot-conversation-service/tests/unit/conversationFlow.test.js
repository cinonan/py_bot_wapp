const { CONVERSATION_STATE } = require('../../src/modules/bot-conversation/domain/conversation/states');
const {
  mapClientLookupResponse,
  handleRegistrationNameTurn,
  handleRegistrationAddressValidation,
  mapRegistrationSuccess,
  handleConfirmingAddressTurn,
  mapCatalogLoadedToTransition,
  buildMenuAccessTransition,
  handleSelectingProductTurn,
  mapProductLookupResponse,
  handleAwaitingQuantityTurn,
  mapAddToCartResponse,
  handleProvidingMenuTurn,
  mapGetCartForConfirmResponse,
} = require('../../src/modules/bot-conversation/domain/conversation/flow');

describe('conversation state transitions', () => {
  test('maps ClientNotFound to registration name state', () => {
    const transition = mapClientLookupResponse({ type: 'ClientNotFound' });

    expect(transition.session.state).toBe(CONVERSATION_STATE.AWAITING_REGISTRATION_NAME);
    expect(transition.replies[0]).toContain('registrarte');
  });

  test('maps ClientFound to confirming address with greeting by name', () => {
    const transition = mapClientLookupResponse({
      type: 'ClientFound',
      payload: JSON.stringify({
        client: {
          id: 1,
          telefono: '51999001001',
          nombre: 'Ana Ruiz',
          direccion_principal: 'Calle 10',
        },
      }),
    });

    expect(transition.session.state).toBe(CONVERSATION_STATE.CONFIRMING_ADDRESS);
    expect(transition.replies[0]).toContain('Ana Ruiz');
    expect(transition.session.metadata.savedAddress).toBe('Calle 10');
  });

  test('keeps user in name state when input is empty', () => {
    const session = {
      state: CONVERSATION_STATE.AWAITING_REGISTRATION_NAME,
      metadata: {},
    };

    const transition = handleRegistrationNameTurn(session, '   ');

    expect(transition.session.state).toBe(CONVERSATION_STATE.AWAITING_REGISTRATION_NAME);
    expect(transition.replies[0]).toContain('vacío');
  });

  test('moves to address state after valid name', () => {
    const session = {
      state: CONVERSATION_STATE.AWAITING_REGISTRATION_NAME,
      metadata: {},
    };

    const transition = handleRegistrationNameTurn(session, 'Juan Pérez');

    expect(transition.session.state).toBe(CONVERSATION_STATE.AWAITING_REGISTRATION_ADDRESS);
    expect(transition.session.metadata.name).toBe('Juan Pérez');
  });

  test('blocks menu access during registration', () => {
    const session = {
      state: CONVERSATION_STATE.AWAITING_REGISTRATION_NAME,
      metadata: {},
    };

    const transition = handleRegistrationNameTurn(session, 'menú');

    expect(transition.session.state).toBe(CONVERSATION_STATE.AWAITING_REGISTRATION_NAME);
    expect(transition.replies[0]).toContain('identificación');
  });

  test('requires registration after valid address input', () => {
    const session = {
      state: CONVERSATION_STATE.AWAITING_REGISTRATION_ADDRESS,
      metadata: { name: 'Juan Pérez' },
    };

    const transition = handleRegistrationAddressValidation(session, 'Av. Lima 123');

    expect(transition.shouldRegister).toBe(true);
    expect(transition.registrationPayload).toEqual({
      nombre: 'Juan Pérez',
      direccion_principal: 'Av. Lima 123',
    });
  });

  test('maps registration success to confirming address', () => {
    const transition = mapRegistrationSuccess({
      nombre: 'Juan Pérez',
      direccion_principal: 'Av. Lima 123',
    });

    expect(transition.session.state).toBe(CONVERSATION_STATE.CONFIRMING_ADDRESS);
    expect(transition.replies[0]).toContain('Registro completado');
  });

  test('stays in confirming address for invalid MISMA/NUEVA answer', () => {
    const session = {
      state: CONVERSATION_STATE.CONFIRMING_ADDRESS,
      metadata: { name: 'Ana', savedAddress: 'Calle 1' },
    };

    const transition = handleConfirmingAddressTurn(session, 'quizá');

    expect(transition.session.state).toBe(CONVERSATION_STATE.CONFIRMING_ADDRESS);
    expect(transition.replies[0]).toContain('MISMA');
  });

  test('marks address confirmed after MISMA with resolved delivery address', () => {
    const session = {
      state: CONVERSATION_STATE.CONFIRMING_ADDRESS,
      metadata: { name: 'Ana', savedAddress: 'Calle 1' },
    };

    const transition = handleConfirmingAddressTurn(session, 'MISMA');

    expect(transition.session.metadata.addressConfirmed).toBe(true);
    expect(transition.session.metadata.direccionEntrega).toBe('Calle 1');
    expect(transition.replies[0]).toContain('dirección guardada');
  });

  test('requests catalog load when menu is accessed without cache', () => {
    const session = {
      state: CONVERSATION_STATE.CONFIRMING_ADDRESS,
      metadata: { name: 'Ana', addressConfirmed: true },
    };

    const transition = buildMenuAccessTransition(session);

    expect(transition.shouldLoadCatalog).toBe(true);
    expect(transition.session.state).toBe(CONVERSATION_STATE.AWAITING_CATALOG);
  });

  test('reuses cached catalog without requesting load', () => {
    const products = [{ id: 1, nombre: 'Arroz con pollo', precio: '18.50' }];
    const session = {
      state: CONVERSATION_STATE.SELECTING_PRODUCT,
      metadata: { catalogCache: products },
    };

    const transition = buildMenuAccessTransition(session);

    expect(transition.shouldLoadCatalog).toBeUndefined();
    expect(transition.session.state).toBe(CONVERSATION_STATE.SELECTING_PRODUCT);
    expect(transition.replies[0]).toContain('Arroz con pollo');
  });

  test('renders empty catalog message when no active products', () => {
    const transition = mapCatalogLoadedToTransition(
      { state: CONVERSATION_STATE.AWAITING_CATALOG, metadata: {} },
      [],
    );

    expect(transition.replies[0]).toContain('no hay productos');
    expect(transition.session.metadata.catalogCache).toEqual([]);
  });

  test('parses product selection and rejects invalid ids locally', () => {
    const session = {
      state: CONVERSATION_STATE.SELECTING_PRODUCT,
      metadata: { catalogCache: [{ id: 1, nombre: 'Arroz', precio: '10.00' }] },
    };

    const invalid = handleSelectingProductTurn(session, 'abc');
    expect(invalid.shouldLookupProduct).toBe(false);
    expect(invalid.replies[0]).toContain('inválido');

    const valid = handleSelectingProductTurn(session, '1');
    expect(valid.shouldLookupProduct).toBe(true);
    expect(valid.productId).toBe(1);
  });

  test('maps ProductNotFound without resetting session state', () => {
    const session = {
      state: CONVERSATION_STATE.SELECTING_PRODUCT,
      metadata: { catalogCache: [{ id: 1, nombre: 'Arroz', precio: '10.00' }] },
    };

    const transition = mapProductLookupResponse(session, { type: 'ProductNotFound' }, 99);

    expect(transition.session.state).toBe(CONVERSATION_STATE.SELECTING_PRODUCT);
    expect(transition.replies[0]).toContain('No encontré');
  });

  test('maps ProductResolved to awaiting quantity state', () => {
    const session = {
      state: CONVERSATION_STATE.SELECTING_PRODUCT,
      metadata: { catalogCache: [{ id: 1, nombre: 'Arroz', precio: '10.00' }] },
    };

    const transition = mapProductLookupResponse(session, {
      type: 'ProductResolved',
      payload: JSON.stringify({
        product: { id: 1, nombre: 'Arroz', precio: '10.00' },
      }),
    }, 1);

    expect(transition.session.state).toBe(CONVERSATION_STATE.AWAITING_QUANTITY);
    expect(transition.replies[1]).toContain('Indica la cantidad');
  });

  test('invalid quantity keeps awaiting quantity state without add command', () => {
    const session = {
      state: CONVERSATION_STATE.AWAITING_QUANTITY,
      metadata: { selectedProduct: { id: 1, nombre: 'Arroz', precio: '10.00' } },
    };

    const transition = handleAwaitingQuantityTurn(session, '0');

    expect(transition.shouldAddToCart).toBe(false);
    expect(transition.session.state).toBe(CONVERSATION_STATE.AWAITING_QUANTITY);
  });

  test('maps CartUpdated to providing menu with subtotal message', () => {
    const session = {
      state: CONVERSATION_STATE.AWAITING_QUANTITY,
      metadata: { selectedProduct: { id: 1, nombre: 'Arroz', precio: '10.00' } },
    };

    const transition = mapAddToCartResponse(
      session,
      {
        type: 'CartUpdated',
        payload: JSON.stringify({
          items: [
            {
              productId: 1,
              cantidad: 2,
              precio_unitario: '10.00',
              nombre_producto: 'Arroz',
            },
          ],
          subtotal: '20.00',
        }),
      },
      { productId: 1, cantidad: 2 },
    );

    expect(transition.session.state).toBe(CONVERSATION_STATE.PROVIDING_MENU);
    expect(transition.replies[0]).toContain('Subtotal acumulado');
    expect(transition.session.metadata.selectedProduct).toBeUndefined();
  });

  test('providing menu option 2 advances toward confirmation when cart has items and address resolved', () => {
    const session = {
      state: CONVERSATION_STATE.PROVIDING_MENU,
      metadata: {
        deliveryAddressChoice: 'misma',
        direccionEntrega: 'Calle 1',
        addressConfirmed: true,
      },
    };

    const choice = handleProvidingMenuTurn(session, '2');
    expect(choice.shouldGetCart).toBe(true);

    const confirmed = mapGetCartForConfirmResponse(session, {
      type: 'CartUpdated',
      payload: JSON.stringify({
        items: [{ productId: 1, cantidad: 1, precio_unitario: '10.00', nombre_producto: 'Arroz' }],
        subtotal: '10.00',
      }),
    });

    expect(confirmed.session.state).toBe(CONVERSATION_STATE.CONFIRMING_ORDER);
  });
});
