const { createGetClientByPhone } = require('../../src/modules/ordering/application/getClientByPhone');

describe('getClientByPhone', () => {
  test('returns ClientFound when repository finds a client', async () => {
    const client = {
      id: 1,
      telefono: '51999001001',
      nombre: 'Cliente Test',
      direccion_principal: 'Av. Principal 123',
      dni: null,
    };
    const clientRepository = {
      findByPhone: jest.fn().mockResolvedValue(client),
    };

    const getClientByPhone = createGetClientByPhone({ clientRepository });
    const result = await getClientByPhone({ phone: '51999001001' });

    expect(result).toEqual({
      eventType: 'ClientFound',
      payload: { client },
    });
    expect(clientRepository.findByPhone).toHaveBeenCalledWith('51999001001');
  });

  test('returns ClientNotFound when repository has no match', async () => {
    const clientRepository = {
      findByPhone: jest.fn().mockResolvedValue(null),
    };

    const getClientByPhone = createGetClientByPhone({ clientRepository });
    const result = await getClientByPhone({ phone: '51999009999' });

    expect(result).toEqual({
      eventType: 'ClientNotFound',
      payload: {},
    });
  });
});
