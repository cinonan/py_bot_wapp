const axios = require('axios');

const GRAPH_VERSION = 'v23.0';
const ADMIN_ORDER_NOTIFY_PHONE = '51942851871';

function getConfig() {
  const token = process.env.WA_ACCESS_TOKEN;
  const phoneNumberId = process.env.WA_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    throw new Error('Faltan WA_ACCESS_TOKEN o WA_PHONE_NUMBER_ID en .env');
  }

  return { token, phoneNumberId };
}

/**
 * Envío genérico de texto (cliente, cocina, administración).
 * @param {string} to - Número en formato E.164 sin + (ej. 51999888777)
 * @param {string} body
 */
async function sendMessage(to, body) {
  const { token, phoneNumberId } = getConfig();

  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`;
  const payload = {
    messaging_product: 'whatsapp',
    to,
    type: 'text',
    text: { body },
  };

  await axios.post(url, payload, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
}

async function sendTextMessage(to, body) {
  return sendMessage(to, body);
}

function formatCurrency(value) {
  const amount = Number(value) || 0;
  return `S/ ${amount.toFixed(2)}`;
}

function formatMenuMessage(products = []) {
  if (!Array.isArray(products) || products.length === 0) {
    return 'Por ahora no hay productos disponibles.';
  }

  const lines = products.map(
    (product) =>
      `${product.id}. ${product.nombre} - ${formatCurrency(product.precio)}`
  );

  return `*Menu disponible:*\n${lines.join('\n')}\n\nResponde con el *ID del producto* que deseas agregar.`;
}

function formatCartItem(item) {
  const quantity = Number(item?.cantidad) || 0;
  const name = item?.nombre || 'Producto';
  const price = Number(item?.precio) || 0;
  const lineTotal = quantity * price;

  return `*${quantity}x* ${name} - ${formatCurrency(lineTotal)}`;
}

function formatCartSummary(cartItems = []) {
  if (!Array.isArray(cartItems) || cartItems.length === 0) {
    return 'Tu carrito está vacío.';
  }

  return cartItems.map((item) => formatCartItem(item)).join('\n');
}

/**
 * Confirma al cliente y notifica a la administradora con el detalle del pedido.
 */
async function notifyOrderPlacedAndAdmin({
  customerPhone,
  orderId,
  customerName,
  deliveryAddress,
  cartItems,
  subtotal,
}) {
  await sendMessage(
    customerPhone,
    `¡Pedido #${orderId} registrado! Pronto cambiaremos tu estado a "En camino".`
  );

  const cartSummaryText = formatCartSummary(cartItems);
  const adminBody = [
    `Pedido #${orderId}`,
    `Cliente: ${customerName || 'N/D'}`,
    `Tel: ${customerPhone}`,
    `Entrega: ${deliveryAddress || 'N/D'}`,
    '',
    cartSummaryText,
    '',
    `Total: ${formatCurrency(subtotal)}`,
  ].join('\n');

  await sendMessage(ADMIN_ORDER_NOTIFY_PHONE, adminBody);
}

module.exports = {
  ADMIN_ORDER_NOTIFY_PHONE,
  formatCartSummary,
  formatCurrency,
  formatMenuMessage,
  formatCartItem,
  notifyOrderPlacedAndAdmin,
  sendMessage,
  sendTextMessage,
};
