const { createConversationStateRouter } = require('./conversationStateRouter');
const { parseDespacharCommand } = require('../domain/conversation/validators');

function createHandleConversationMessage({
  sessionStore,
  streamCommandClient,
  adminOrderNotifyPhone,
  handleAdminDispatchMessage,
}) {
  const routeConversationMessage = createConversationStateRouter({
    sessionStore,
    streamCommandClient,
    adminOrderNotifyPhone,
  });

  return async function handleConversationMessage({ phone, text, wamid }) {
    const orderId = parseDespacharCommand(text);
    if (orderId !== null) {
      return handleAdminDispatchMessage({ phone, wamid, orderId });
    }

    const session = await sessionStore.get(phone);
    return routeConversationMessage({ phone, text, wamid, session });
  };
}

module.exports = { createHandleConversationMessage };
