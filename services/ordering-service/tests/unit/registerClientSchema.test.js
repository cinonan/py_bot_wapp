const {
  registerClientPayloadSchema,
  parseRegisterClientPayload,
} = require('../../src/modules/ordering/domain/client/registerClientSchema');

describe('registerClientPayloadSchema', () => {
  test('accepts valid nombre and direccion_principal', () => {
    const result = registerClientPayloadSchema.parse({
      nombre: 'María López',
      direccion_principal: 'Av. Principal 123, Lima',
    });

    expect(result).toEqual({
      nombre: 'María López',
      direccion_principal: 'Av. Principal 123, Lima',
    });
  });

  test('rejects empty nombre', () => {
    expect(() =>
      registerClientPayloadSchema.parse({
        nombre: '   ',
        direccion_principal: 'Av. Principal 123',
      }),
    ).toThrow(/nombre is required/);
  });

  test('rejects short direccion_principal', () => {
    expect(() =>
      registerClientPayloadSchema.parse({
        nombre: 'Juan Pérez',
        direccion_principal: 'abc',
      }),
    ).toThrow(/at least 5 characters/);
  });

  test('parses JSON payload string', () => {
    const result = parseRegisterClientPayload(
      JSON.stringify({
        nombre: 'Ana Ruiz',
        direccion_principal: 'Calle Los Olivos 45',
      }),
    );

    expect(result.nombre).toBe('Ana Ruiz');
  });
});
