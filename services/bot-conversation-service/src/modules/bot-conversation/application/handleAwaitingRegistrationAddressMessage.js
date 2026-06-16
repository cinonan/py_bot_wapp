const {
  handleRegistrationAddressValidation,
  mapRegistrationSuccess,
} = require('../domain/conversation/flow');
const { parseClientRegisteredPayload } = require('../domain/messaging/clientEventSchemas');

function createHandleAwaitingRegistrationAddressMessage({ sessionStore, streamCommandClient }) {
  return async function handleAwaitingRegistrationAddressMessage({ phone, text, wamid, session }) {
    const validation = handleRegistrationAddressValidation(session, text);
    if (!validation.shouldRegister) {
      await sessionStore.set(phone, validation.session);
      return validation;
    }

    const response = await streamCommandClient.registerClient({
      wamid,
      phone,
      payload: validation.registrationPayload,
    });

    if (response.timedOut) {
      return {
        replies: [response.waitingMessage],
        session,
      };
    }

    if (response.type === 'RegisterClientFailed') {
      return {
        replies: [
          'No pudimos completar tu registro. Revisa tus datos e intenta de nuevo.',
        ],
        session,
      };
    }

    if (response.type === 'ClientRegistered') {
      const { client } = parseClientRegisteredPayload(response.payload);
      const transition = mapRegistrationSuccess(client);
      await sessionStore.set(phone, transition.session);
      return transition;
    }

    return {
      replies: ['Ocurrió un error inesperado. Intenta de nuevo.'],
      session,
    };
  };
}

module.exports = { createHandleAwaitingRegistrationAddressMessage };
