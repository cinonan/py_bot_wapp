const { CONVERSATION_STATE } = require('./states');

function normalizeText(text) {
  return String(text ?? '').trim();
}

function validateRegistrationName(text) {
  const value = normalizeText(text);

  if (!value) {
    return {
      valid: false,
      message:
        'El nombre no puede estar vacío. Por favor envía tu Nombre y Apellidos.',
    };
  }

  if (value.length > 100) {
    return {
      valid: false,
      message: 'El nombre es demasiado largo. Usa como máximo 100 caracteres.',
    };
  }

  return { valid: true, value };
}

function validateRegistrationAddress(text) {
  const value = normalizeText(text);

  if (!value) {
    return {
      valid: false,
      message:
        'La dirección no puede estar vacía. Envía tu dirección principal de entrega.',
    };
  }

  if (value.length < 5) {
    return {
      valid: false,
      message:
        'La dirección es demasiado corta. Incluye calle, número y referencia.',
    };
  }

  return { valid: true, value };
}

function isMenuAccessAttempt(text) {
  return /^(ver\s+)?men[uú]$/i.test(normalizeText(text));
}

function parseProductSelectionId(text) {
  const value = normalizeText(text);
  if (!/^\d+$/.test(value)) {
    return null;
  }

  const productId = Number(value);
  if (!Number.isInteger(productId) || productId <= 0) {
    return null;
  }

  return productId;
}

function isMenuAccessAllowed(session) {
  if (!session) {
    return false;
  }

  if (
    session.state === CONVERSATION_STATE.AWAITING_REGISTRATION_NAME
    || session.state === CONVERSATION_STATE.AWAITING_REGISTRATION_ADDRESS
  ) {
    return false;
  }

  if (session.state === CONVERSATION_STATE.CONFIRMING_ADDRESS) {
    return Boolean(session.metadata?.addressConfirmed);
  }

  return true;
}

function validateCartQuantity(text) {
  const value = normalizeText(text);

  if (!/^\d+$/.test(value)) {
    return {
      valid: false,
      message: 'Cantidad inválida. Debe ser un número entero mayor a 0. Ejemplo: 2',
    };
  }

  const quantity = Number(value);
  if (!Number.isInteger(quantity) || quantity <= 0) {
    return {
      valid: false,
      message: 'Cantidad inválida. Debe ser un número entero mayor a 0. Ejemplo: 2',
    };
  }

  return { valid: true, value: quantity };
}

function parseProvidingMenuChoice(text) {
  const value = normalizeText(text);
  if (value === '1' || value === '2') {
    return value;
  }

  return null;
}

module.exports = {
  normalizeText,
  validateRegistrationName,
  validateRegistrationAddress,
  isMenuAccessAttempt,
  parseProductSelectionId,
  isMenuAccessAllowed,
  validateCartQuantity,
  parseProvidingMenuChoice,
};
