function formatCurrency(value) {
  const amount = Number(value) || 0;
  return `S/ ${amount.toFixed(2)}`;
}

function formatCatalogMenu(products = []) {
  if (!Array.isArray(products) || products.length === 0) {
    return formatEmptyCatalogMessage();
  }

  const lines = products.map(
    (product) => `${product.id}. ${product.nombre} - ${formatCurrency(product.precio)}`,
  );

  return `*Menú disponible:*\n${lines.join('\n')}\n\nResponde con el *ID del producto* que deseas agregar.`;
}

function formatEmptyCatalogMessage() {
  return 'Por ahora no hay productos disponibles. Intenta más tarde.';
}

module.exports = {
  formatCurrency,
  formatCatalogMenu,
  formatEmptyCatalogMessage,
};
