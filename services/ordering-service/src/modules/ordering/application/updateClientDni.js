const { parseUpdateClientDniPayload } = require('../domain/client/updateClientDniSchema');

/**
 * @typedef {object} ClientRepositoryPort
 * @property {(telefono: string, dni: string) => Promise<object|null>} updateDni
 */

/**
 * @param {{ clientRepository: ClientRepositoryPort }} deps
 */
function createUpdateClientDni({ clientRepository }) {
  return async function updateClientDni({ phone, payloadJson }) {
    const payload = parseUpdateClientDniPayload(payloadJson);
    const client = await clientRepository.updateDni(phone, payload.dni);

    if (!client) {
      return {
        eventType: 'UpdateClientDniFailed',
        payload: { reason: 'client_not_found' },
      };
    }

    return {
      eventType: 'ClientDniUpdated',
      payload: { client },
    };
  };
}

module.exports = { createUpdateClientDni };
