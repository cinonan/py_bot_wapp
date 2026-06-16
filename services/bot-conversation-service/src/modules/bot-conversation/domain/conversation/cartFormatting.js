const { formatCurrency } = require('./catalogFormatting');

function formatCartItem(item) {
  const quantity = Number(item.cantidad) || 0;
  const unitPrice = Number(item.precio_unitario) || 0;
  const lineTotal = unitPrice * quantity;
  return `- ${item.nombre_producto} x${quantity} (${formatCurrency(unitPrice)} c/u) = ${formatCurrency(lineTotal)}`;
}

function formatCartSummary(items = []) {
  if (!Array.isArray(items) || items.length === 0) {
    return 'Tu carrito está vacío.';
  }

  return items.map((item) => formatCartItem(item)).join('\n');
}

function formatCartAddedMessage({ addedItem, items, subtotal }) {
  const addedLine = formatCartItem(addedItem);
  const cartSummary = formatCartSummary(items);

  return [
    `Agregado al carrito: ${addedLine}`,
    '',
    'Tu carrito:',
    cartSummary,
    '',
    `Subtotal acumulado: *${formatCurrency(subtotal)}*`,
    '',
    '¿Deseas agregar algo más?',
    '1. Ver Menú',
    '2. Confirmar Pedido',
  ].join('\n');
}

function formatProvidingMenuPrompt() {
  return '¿Deseas agregar algo más?\n1. Ver Menú\n2. Confirmar Pedido';
}

module.exports = {
  formatCartItem,
  formatCartSummary,
  formatCartAddedMessage,
  formatProvidingMenuPrompt,
};
