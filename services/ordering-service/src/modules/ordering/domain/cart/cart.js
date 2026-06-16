function mergeCartItem(items, incomingItem) {
  const cart = Array.isArray(items) ? [...items] : [];
  const existingIndex = cart.findIndex((item) => item.productId === incomingItem.productId);

  if (existingIndex >= 0) {
    cart[existingIndex] = {
      ...cart[existingIndex],
      cantidad: cart[existingIndex].cantidad + incomingItem.cantidad,
    };
    return cart;
  }

  cart.push({ ...incomingItem });
  return cart;
}

function calculateSubtotal(items = []) {
  const total = items.reduce((sum, item) => {
    const unitPrice = Number(item.precio_unitario) || 0;
    const quantity = Number(item.cantidad) || 0;
    return sum + unitPrice * quantity;
  }, 0);

  return total.toFixed(2);
}

module.exports = {
  mergeCartItem,
  calculateSubtotal,
};
