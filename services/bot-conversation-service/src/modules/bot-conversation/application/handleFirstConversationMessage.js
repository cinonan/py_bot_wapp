const { mapClientLookupResponse } = require('../domain/conversation/flow');

function createHandleFirstConversationMessage({ sessionStore, streamCommandClient }) {
  return async function handleFirstConversationMessage({ phone, text, wamid }) {
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
  };
}

module.exports = { createHandleFirstConversationMessage };
