const { createUpdateClientDni } = require('../../src/modules/ordering/application/updateClientDni');

describe('updateClientDni', () => {
  test('updates profile and returns ClientDniUpdated', async () => {
    const updated = {
      id: 3,
      telefono: '51999001005',
      nombre: 'Cliente',
      direccion_principal: 'Jr. Lima 456',
      dni: '12345678',
    };
    const clientRepository = {
      updateDni: jest.fn().mockResolvedValue(updated),
    };

    const updateClientDni = createUpdateClientDni({ clientRepository });
    const result = await updateClientDni({
      phone: '51999001005',
      payloadJson: JSON.stringify({ dni: '12345678' }),
    });

    expect(result).toEqual({
      eventType: 'ClientDniUpdated',
      payload: { client: updated },
    });
    expect(clientRepository.updateDni).toHaveBeenCalledWith('51999001005', '12345678');
  });

  test('returns UpdateClientDniFailed when client does not exist', async () => {
    const clientRepository = {
      updateDni: jest.fn().mockResolvedValue(null),
    };

    const updateClientDni = createUpdateClientDni({ clientRepository });
    const result = await updateClientDni({
      phone: '51999001999',
      payloadJson: JSON.stringify({ dni: '87654321' }),
    });

    expect(result).toEqual({
      eventType: 'UpdateClientDniFailed',
      payload: { reason: 'client_not_found' },
    });
  });
});
