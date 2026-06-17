const { parseDispatchOrderPayload } = require('../domain/order/dispatchOrderSchema');

/**
 * @typedef {import('../infrastructure/postgres/orderRepository').OrderRepositoryPort} OrderRepositoryPort
 */

/**
 * @param {{ orderRepository: OrderRepositoryPort }} deps
 */
function createDispatchOrder({ orderRepository }) {
  return async function dispatchOrder({ payloadJson }) {
    const payload = parseDispatchOrderPayload(payloadJson);
    const result = await orderRepository.dispatchFromPendiente(payload.orderId);

    if (!result.ok) {
      return {
        eventType: 'OrderDispatchFailed',
        payload: result.currentState
          ? { reason: result.reason, currentState: result.currentState }
          : { reason: result.reason },
      };
    }

    const { order, client } = result;

    return {
      eventType: 'OrderDispatched',
      payload: {
        order: {
          id: order.id,
          total: order.total,
          estado: order.estado,
          direccion_entrega: order.direccion_entrega,
          fecha_atencion: order.fecha_atencion,
        },
        client: {
          id: client.id,
          nombre: client.nombre,
          telefono: client.telefono,
        },
      },
    };
  };
}

module.exports = { createDispatchOrder };
