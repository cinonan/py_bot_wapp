const {
  handleConfirmingOrderTurn,
  mapPlaceOrderResponse,
  buildDniUpdateWarningTransition,
} = require('../domain/conversation/flow');

function createHandleConfirmingOrderMessage({
  sessionStore,
  streamCommandClient,
  adminOrderNotifyPhone,
}) {
  return async function handleConfirmingOrderMessage({ phone, text, wamid, session }) {
    const transition = handleConfirmingOrderTurn(session, text);

    if (!transition.shouldPlaceOrder) {
      await sessionStore.set(phone, transition.session);
      return transition;
    }

    if (transition.shouldUpdateClientDni) {
      const dniResponse = await streamCommandClient.updateClientDni({
        wamid: `${wamid}:dni`,
        phone,
        payload: { dni: transition.dni },
      });

      const placeResponse = await streamCommandClient.placeOrder({
        wamid,
        phone,
        payload: transition.placeOrderPayload,
      });

      const placeTransition = mapPlaceOrderResponse(session, placeResponse, {
        adminOrderNotifyPhone,
        customerPhone: phone,
      });

      if (placeTransition.session === null) {
        await sessionStore.clear(phone);
      } else {
        await sessionStore.set(phone, placeTransition.session);
      }

      if (dniResponse.type === 'UpdateClientDniFailed') {
        return buildDniUpdateWarningTransition(session, placeTransition);
      }

      return placeTransition;
    }

    const placeResponse = await streamCommandClient.placeOrder({
      wamid,
      phone,
      payload: transition.placeOrderPayload,
    });

    const placeTransition = mapPlaceOrderResponse(session, placeResponse, {
      adminOrderNotifyPhone,
      customerPhone: phone,
    });

    if (placeTransition.session === null) {
      await sessionStore.clear(phone);
    } else {
      await sessionStore.set(phone, placeTransition.session);
    }

    return placeTransition;
  };
}

module.exports = { createHandleConfirmingOrderMessage };
