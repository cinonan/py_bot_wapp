const { parseRegisterClientPayload } = require('../domain/client/registerClientSchema');

/**
 * @typedef {object} ClientRepositoryPort
 * @property {(data: { telefono: string, nombre: string, direccion_principal: string }) => Promise<object>} create
 */

/**
 * @param {{ clientRepository: ClientRepositoryPort }} deps
 */
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
