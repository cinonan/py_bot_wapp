const { calculateSubtotal } = require('../domain/cart/cart');
const { parsePlaceOrderPayload } = require('../domain/order/placeOrderSchema');

/**
 * @typedef {import('../infrastructure/redis/cartStore').CartStorePort} CartStorePort
 * @typedef {import('../infrastructure/postgres/clientRepository').ClientRepositoryPort} ClientRepositoryPort
 * @typedef {import('../infrastructure/postgres/orderRepository').OrderRepositoryPort} OrderRepositoryPort
 */

/**
 * @param {{
 *   cartStore: CartStorePort,
 *   clientRepository: ClientRepositoryPort,
 *   orderRepository: OrderRepositoryPort,
 * }} deps
 */
function createPlaceOrder({ cartStore, clientRepository, orderRepository }) {
  return async function placeOrder({ phone, payloadJson }) {
    const payload = parsePlaceOrderPayload(payloadJson);
    const items = await cartStore.getItems(phone);

    if (!items.length) {
      return {
        eventType: 'OrderPlaceFailed',
        payload: { reason: 'empty_cart' },
      };
    }

    const client = await clientRepository.findByPhone(phone);
    if (!client) {
      return {
        eventType: 'OrderPlaceFailed',
        payload: { reason: 'client_not_found' },
      };
    }

    const total = calculateSubtotal(items);
    const order = await orderRepository.createWithDetails({
      clienteId: client.id,
      direccion_entrega: payload.direccion_entrega,
      dni_facturacion: payload.dni_facturacion ?? null,
      total,
      items,
    });

    await cartStore.clear(phone);

    return {
      eventType: 'OrderPlaced',
      payload: {
        order: {
          id: order.id,
          total: order.total,
          estado: order.estado,
          direccion_entrega: order.direccion_entrega,
          dni_facturacion: order.dni_facturacion,
          items,
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

module.exports = { createPlaceOrder };
