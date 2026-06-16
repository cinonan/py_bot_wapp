const { CONVERSATION_STATE } = require('../../src/modules/bot-conversation/domain/conversation/states');
const {
  mapClientLookupResponse,
  handleRegistrationNameTurn,
  handleRegistrationAddressValidation,
  mapRegistrationSuccess,
  handleConfirmingAddressTurn,
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
});
