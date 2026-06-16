const { createConversationStateRouter } = require('./conversationStateRouter');

function createHandleConversationMessage({ sessionStore, streamCommandClient }) {
  const routeConversationMessage = createConversationStateRouter({
    sessionStore,
    streamCommandClient,
  });

  return async function handleConversationMessage({ phone, text, wamid }) {
    const session = await sessionStore.get(phone);
    return routeConversationMessage({ phone, text, wamid, session });
  };
}

module.exports = { createHandleConversationMessage };
