const { normalizePhoneDigits } = require('../infrastructure/meta/incomingMessageParser');
const { MESSAGES, mapDispatchOrderResponse } = require('../domain/conversation/flow');

function createHandleAdminDispatchMessage({ streamCommandClient, adminOrderNotifyPhone }) {
  return async function handleAdminDispatchMessage({ phone, wamid, orderId }) {
    const normalizedAdminPhone = normalizePhoneDigits(adminOrderNotifyPhone);

    if (!normalizedAdminPhone || phone !== normalizedAdminPhone) {
      return {
        replies: [MESSAGES.dispatchUnauthorized],
      };
    }

    const response = await streamCommandClient.dispatchOrder({
      wamid,
      phone,
      payload: { orderId },
    });

    return mapDispatchOrderResponse(response, orderId);
  };
}

module.exports = { createHandleAdminDispatchMessage };
