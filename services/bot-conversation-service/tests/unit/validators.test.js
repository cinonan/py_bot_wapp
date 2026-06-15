const {
  validateRegistrationName,
  validateRegistrationAddress,
  isMenuAccessAttempt,
} = require('../../src/modules/bot-conversation/domain/conversation/validators');

describe('conversation validators', () => {
  test('rejects empty registration name', () => {
    const result = validateRegistrationName('   ');

    expect(result.valid).toBe(false);
    expect(result.message).toContain('vacío');
  });

  test('accepts valid registration name', () => {
    const result = validateRegistrationName('  María López  ');

    expect(result).toEqual({ valid: true, value: 'María López' });
  });

  test('rejects short registration address', () => {
    const result = validateRegistrationAddress('abc');

    expect(result.valid).toBe(false);
    expect(result.message).toContain('corta');
  });

  test('accepts valid registration address', () => {
    const result = validateRegistrationAddress('Av. Principal 123');

    expect(result).toEqual({ valid: true, value: 'Av. Principal 123' });
  });

  test('detects menu access attempts', () => {
    expect(isMenuAccessAttempt('menú')).toBe(true);
    expect(isMenuAccessAttempt('ver menu')).toBe(true);
    expect(isMenuAccessAttempt('hola')).toBe(false);
  });
});
