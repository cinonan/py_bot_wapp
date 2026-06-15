const { createRegisterClient } = require('../../src/modules/ordering/application/registerClient');

describe('registerClient', () => {
  test('persists client and returns ClientRegistered', async () => {
    const created = {
      id: 7,
      telefono: '51999001005',
      nombre: 'Nuevo Cliente',
      direccion_principal: 'Jr. Lima 456',
      dni: null,
    };
    const clientRepository = {
      create: jest.fn().mockResolvedValue(created),
    };

    const registerClient = createRegisterClient({ clientRepository });
    const result = await registerClient({
      phone: '51999001005',
      payloadJson: JSON.stringify({
        nombre: 'Nuevo Cliente',
        direccion_principal: 'Jr. Lima 456',
      }),
    });

    expect(result).toEqual({
      eventType: 'ClientRegistered',
      payload: { client: created },
    });
    expect(clientRepository.create).toHaveBeenCalledWith({
      telefono: '51999001005',
      nombre: 'Nuevo Cliente',
      direccion_principal: 'Jr. Lima 456',
    });
  });
});
