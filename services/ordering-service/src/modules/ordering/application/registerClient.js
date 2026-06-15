const { parseRegisterClientPayload } = require('../domain/client/registerClientSchema');

function createRegisterClient({ clientRepository }) {
  return async function registerClient({ phone, payloadJson }) {
    const payload = parseRegisterClientPayload(payloadJson);
    const client = await clientRepository.create({
      telefono: phone,
      nombre: payload.nombre,
      direccion_principal: payload.direccion_principal,
    });

    return {
      eventType: 'ClientRegistered',
      payload: { client },
    };
  };
}

module.exports = { createRegisterClient };
