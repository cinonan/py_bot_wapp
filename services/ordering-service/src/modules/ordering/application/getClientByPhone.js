/**
 * @typedef {object} ClientRepositoryPort
 * @property {(telefono: string) => Promise<object|null>} findByPhone
 */

/**
 * @param {{ clientRepository: ClientRepositoryPort }} deps
 */
function createGetClientByPhone({ clientRepository }) {
  return async function getClientByPhone({ phone }) {
    const client = await clientRepository.findByPhone(phone);

    if (client) {
      return {
        eventType: 'ClientFound',
        payload: { client },
      };
    }

    return {
      eventType: 'ClientNotFound',
      payload: {},
    };
  };
}

module.exports = { createGetClientByPhone };
