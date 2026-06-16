const { handleConfirmingAddressTurn } = require('../domain/conversation/flow');

function createHandleConfirmingAddressMessage({ sessionStore }) {
  return async function handleConfirmingAddressMessage({ phone, text, session }) {
    const transition = handleConfirmingAddressTurn(session, text);
    await sessionStore.set(phone, transition.session);
    return transition;
  };
}

module.exports = { createHandleConfirmingAddressMessage };
