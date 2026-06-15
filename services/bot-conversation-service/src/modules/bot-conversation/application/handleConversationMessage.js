const { CONVERSATION_STATE } = require('../domain/conversation/states');
const {
  mapClientLookupResponse,
  handleRegistrationNameTurn,
  handleRegistrationAddressValidation,
  mapRegistrationSuccess,
  handleConfirmingAddressTurn,
} = require('../domain/conversation/flow');

function createHandleConversationMessage({ sessionStore, streamCommandClient }) {
  return async function handleConversationMessage({ phone, text, wamid }) {
    const session = await sessionStore.get(phone);

    if (!session) {
      const response = await streamCommandClient.getClientByPhone({ wamid, phone });

      if (response.timedOut) {
        return {
          replies: [response.waitingMessage],
          session: null,
        };
      }

      const transition = mapClientLookupResponse(response);
      if (transition.session) {
        await sessionStore.set(phone, transition.session);
      }

      return transition;
    }

    switch (session.state) {
      case CONVERSATION_STATE.AWAITING_REGISTRATION_NAME: {
        const transition = handleRegistrationNameTurn(session, text);
        await sessionStore.set(phone, transition.session);
        return transition;
      }

      case CONVERSATION_STATE.AWAITING_REGISTRATION_ADDRESS: {
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
          const payload = JSON.parse(response.payload || '{}');
          const transition = mapRegistrationSuccess(payload.client);
          await sessionStore.set(phone, transition.session);
          return transition;
        }

        return {
          replies: ['Ocurrió un error inesperado. Intenta de nuevo.'],
          session,
        };
      }

      case CONVERSATION_STATE.CONFIRMING_ADDRESS: {
        const transition = handleConfirmingAddressTurn(session, text);
        await sessionStore.set(phone, transition.session);
        return transition;
      }

      default:
        return {
          replies: ['Estado no reconocido. Envía cualquier mensaje para reiniciar.'],
          session: null,
        };
    }
  };
}

module.exports = { createHandleConversationMessage };
