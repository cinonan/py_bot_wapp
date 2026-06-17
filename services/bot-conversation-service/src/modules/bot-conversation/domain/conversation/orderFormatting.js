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

module.exports = {
  formatOrderConfirmationMessage,
  formatAdminOrderNotification,
};
