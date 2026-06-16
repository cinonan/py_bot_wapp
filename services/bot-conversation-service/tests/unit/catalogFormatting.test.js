const { formatCurrency, formatCatalogMenu, formatEmptyCatalogMessage } = require('../../src/modules/bot-conversation/domain/conversation/catalogFormatting');

describe('catalog formatting', () => {
  test('formats currency as S/ X.XX', () => {
    expect(formatCurrency('18.5')).toBe('S/ 18.50');
    expect(formatCurrency(22)).toBe('S/ 22.00');
  });

  test('renders numbered menu with prices', () => {
    const menu = formatCatalogMenu([
      { id: 1, nombre: 'Arroz con pollo', precio: '18.50' },
      { id: 2, nombre: 'Lomo saltado', precio: '22.00' },
    ]);

    expect(menu).toContain('1. Arroz con pollo - S/ 18.50');
    expect(menu).toContain('2. Lomo saltado - S/ 22.00');
    expect(menu).toContain('ID del producto');
  });

  test('returns informative message for empty catalog', () => {
    expect(formatEmptyCatalogMessage()).toContain('no hay productos');
  });
});
