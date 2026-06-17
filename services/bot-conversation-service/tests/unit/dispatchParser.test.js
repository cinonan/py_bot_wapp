const { parseDespacharCommand } = require('../../src/modules/bot-conversation/domain/conversation/validators');

describe('parseDespacharCommand', () => {
  test('extracts numeric order id from Despachar command', () => {
    expect(parseDespacharCommand('Despachar 42')).toBe(42);
    expect(parseDespacharCommand('  despachar   123  ')).toBe(123);
  });

  test('returns null for non-dispatch messages', () => {
    expect(parseDespacharCommand('Ver Menú')).toBeNull();
    expect(parseDespacharCommand('Despachar abc')).toBeNull();
    expect(parseDespacharCommand('Despachar')).toBeNull();
  });
});
