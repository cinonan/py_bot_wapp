const { createConversationStateRouter } = require('./conversationStateRouter');

function createHandleConversationMessage({ sessionStore, streamCommandClient, adminOrderNotifyPhone }) {
  const routeConversationMessage = createConversationStateRouter({
    sessionStore,
    streamCommandClient,
    adminOrderNotifyPhone,
  });

  return async function handleConversationMessage({ phone, text, wamid }) {
    const session = await sessionStore.get(phone);
    return routeConversationMessage({ phone, text, wamid, session });
  };
}

module.exports = { createHandleConversationMessage };
