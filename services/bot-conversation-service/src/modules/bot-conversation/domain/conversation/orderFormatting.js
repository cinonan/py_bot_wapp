const { formatCurrency } = require('./catalogFormatting');
const { formatCartSummary } = require('./cartFormatting');

function formatOrderConfirmationMessage({ orderId, total }) {
  return `¡Pedido #${orderId} registrado! Total: *${formatCurrency(total)}*. Pronto cambiaremos tu estado a "En camino".`;
}

function formatAdminOrderNotification({
  orderId,
  customerName,
  customerPhone,
  deliveryAddress,
  items,
  total,
}) {
  return [
    `Pedido #${orderId}`,
    `Cliente: ${customerName || 'N/D'}`,
    `Tel: ${customerPhone}`,
    `Entrega: ${deliveryAddress || 'N/D'}`,
    '',
    formatCartSummary(items),
    '',
    `Total: ${formatCurrency(total)}`,
  ].join('\n');
}

function formatDispatchCustomerMessage() {
  return '¡Buenas noticias! Tu pedido de El Sabor de la Selva está en camino.';
}

function formatDispatchSuccessMessage(orderId) {
  return `Despacho confirmado: el pedido #${orderId} pasó a "en camino" y se notificó al cliente.`;
}

function formatDispatchOrderNotFoundMessage(orderId) {
  return `No encontré el pedido #${orderId}. Verifica el ID.`;
}

function formatDispatchInvalidStateMessage(orderId, currentState) {
  return `El pedido #${orderId} no puede despacharse porque está en estado "${currentState}". Solo se pueden despachar pedidos pendientes.`;
}

module.exports = {
  formatOrderConfirmationMessage,
  formatAdminOrderNotification,
  formatDispatchCustomerMessage,
  formatDispatchSuccessMessage,
  formatDispatchOrderNotFoundMessage,
  formatDispatchInvalidStateMessage,
};
