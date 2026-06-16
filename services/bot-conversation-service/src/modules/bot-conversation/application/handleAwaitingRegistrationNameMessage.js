const { handleRegistrationNameTurn } = require('../domain/conversation/flow');

function createHandleAwaitingRegistrationNameMessage({ sessionStore }) {
  return async function handleAwaitingRegistrationNameMessage({ phone, text, session }) {
    const transition = handleRegistrationNameTurn(session, text);
    await sessionStore.set(phone, transition.session);
    return transition;
  };
}

module.exports = { createHandleAwaitingRegistrationNameMessage };
