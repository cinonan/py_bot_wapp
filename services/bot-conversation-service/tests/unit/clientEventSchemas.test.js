const {
  parseClientFoundPayload,
  parseClientRegisteredPayload,
} = require('../../src/modules/bot-conversation/domain/messaging/clientEventSchemas');

describe('clientEventSchemas', () => {
  test('parses ClientFound payload', () => {
    const result = parseClientFoundPayload(
      JSON.stringify({
        client: {
          id: 1,
          telefono: '51999001001',
          nombre: 'Ana Ruiz',
          direccion_principal: 'Calle 10',
          dni: null,
        },
      }),
    );

    expect(result.client.nombre).toBe('Ana Ruiz');
  });

  test('parses ClientRegistered payload', () => {
    const result = parseClientRegisteredPayload({
      client: {
        id: 2,
        telefono: '51999001002',
        nombre: 'Juan Pérez',
        direccion_principal: 'Av. Lima 123',
      },
    });

    expect(result.client.telefono).toBe('51999001002');
  });
});
