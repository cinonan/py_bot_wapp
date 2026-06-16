const { CONVERSATION_STATE } = require('./states');
const {
  validateRegistrationName,
  validateRegistrationAddress,
  isMenuAccessAttempt,
} = require('./validators');
const { parseClientFoundPayload } = require('../messaging/clientEventSchemas');

const MESSAGES = {
  askName:
    'Hola, para registrarte necesito tus datos.\nPor favor envía tu Nombre y Apellidos.',
  askAddress: 'Gracias. Ahora envía tu dirección principal.',
  menuBlocked:
    'Primero debes completar tu identificación antes de ver el menú.',
  confirmAddressPrompt: (name) =>
    `Hola ${name}, te damos la bienvenida de nuevo.\n¿Usarás tu dirección guardada o una nueva?\nResponde: MISMA o NUEVA.`,
  registrationComplete: (name) => `Registro completado, ${name}.`,
  invalidAddressChoice:
    'Responde MISMA para usar tu dirección guardada o NUEVA para indicar otra.',
};

function mapClientLookupResponse(response) {
  if (response.type === 'ClientNotFound') {
    return {
      replies: [MESSAGES.askName],
      session: {
        state: CONVERSATION_STATE.AWAITING_REGISTRATION_NAME,
        metadata: {},
      },
    };
  }

  if (response.type === 'ClientFound') {
    const { client } = parseClientFoundPayload(response.payload);

    return {
      replies: [MESSAGES.confirmAddressPrompt(client.nombre)],
      session: {
        state: CONVERSATION_STATE.CONFIRMING_ADDRESS,
        metadata: {
          name: client.nombre,
          savedAddress: client.direccion_principal || '',
        },
      },
    };
  }

  return {
    replies: ['No pudimos verificar tu registro. Intenta de nuevo en un momento.'],
    session: null,
  };
}

function handleRegistrationNameTurn(session, text) {
  if (isMenuAccessAttempt(text)) {
    return {
      replies: [MESSAGES.menuBlocked],
      session,
    };
  }

  const validation = validateRegistrationName(text);
  if (!validation.valid) {
    return {
      replies: [validation.message],
      session,
    };
  }

  return {
    replies: [MESSAGES.askAddress],
    session: {
      state: CONVERSATION_STATE.AWAITING_REGISTRATION_ADDRESS,
      metadata: {
        ...session.metadata,
        name: validation.value,
      },
    },
  };
}

function handleRegistrationAddressValidation(session, text) {
  if (isMenuAccessAttempt(text)) {
    return {
      replies: [MESSAGES.menuBlocked],
      session,
      shouldRegister: false,
    };
  }

  const validation = validateRegistrationAddress(text);
  if (!validation.valid) {
    return {
      replies: [validation.message],
      session,
      shouldRegister: false,
    };
  }

  return {
    replies: [],
    session,
    shouldRegister: true,
    registrationPayload: {
      nombre: session.metadata.name,
      direccion_principal: validation.value,
    },
  };
}

function mapRegistrationSuccess(client) {
  return {
    replies: [
      MESSAGES.registrationComplete(client.nombre),
      MESSAGES.confirmAddressPrompt(client.nombre),
    ],
    session: {
      state: CONVERSATION_STATE.CONFIRMING_ADDRESS,
      metadata: {
        name: client.nombre,
        savedAddress: client.direccion_principal || '',
      },
    },
  };
}

function handleConfirmingAddressTurn(session, text) {
  if (isMenuAccessAttempt(text)) {
    return {
      replies: [MESSAGES.menuBlocked],
      session,
    };
  }

  const answer = String(text ?? '').trim().toLowerCase();
  if (answer === 'misma' || answer === 'nueva') {
    return {
      replies: [
        'Dirección registrada. El menú estará disponible en el siguiente paso del flujo.',
      ],
      session,
    };
  }

  return {
    replies: [MESSAGES.invalidAddressChoice],
    session,
  };
}

module.exports = {
  MESSAGES,
  mapClientLookupResponse,
  handleRegistrationNameTurn,
  handleRegistrationAddressValidation,
  mapRegistrationSuccess,
  handleConfirmingAddressTurn,
};
