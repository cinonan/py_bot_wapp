const { createCommandIdempotency } = require('../../src/modules/ordering/application/commandIdempotency');
const { createIdempotentDispatchStreamCommand } = require('../../src/modules/ordering/application/idempotentDispatchStreamCommand');

describe('command idempotency', () => {
  test('duplicate wamid replays cached response without running handler', async () => {
    const innerDispatch = jest.fn();
    const basePublish = jest.fn().mockResolvedValue(undefined);
    const processedCommandCache = {
      get: jest.fn().mockResolvedValue({
        eventType: 'OrderPlaced',
        payload: { order: { id: 99 } },
      }),
      set: jest.fn(),
    };
    const processedCommandRepository = {
      exists: jest.fn(),
      insert: jest.fn(),
    };
    const commandIdempotency = createCommandIdempotency({
      processedCommandCache,
      processedCommandRepository,
    });
    const publishStreamEvent = commandIdempotency.wrapPublishStreamEvent(basePublish);
    const dispatch = createIdempotentDispatchStreamCommand({
      dispatchStreamCommand: innerDispatch,
      commandIdempotency,
      publishStreamEvent: basePublish,
    });

    const fields = {
      type: 'PlaceOrder',
      wamid: 'wamid.duplicate.001',
      correlationId: 'corr-retry',
      phone: '51999001001',
      timestamp: '2026-06-16T12:00:00.000Z',
      payload: JSON.stringify({ direccion_entrega: 'Av. Test 123' }),
    };

    await dispatch({ fields });

    expect(innerDispatch).not.toHaveBeenCalled();
    expect(basePublish).toHaveBeenCalledWith(
      expect.objectContaining({ wamid: 'wamid.duplicate.001', correlationId: 'corr-retry' }),
      'OrderPlaced',
      { order: { id: 99 } },
    );
    expect(processedCommandRepository.exists).not.toHaveBeenCalled();
  });

  test('duplicate wamid without cache is ignored silently', async () => {
    const innerDispatch = jest.fn();
    const basePublish = jest.fn().mockResolvedValue(undefined);
    const commandIdempotency = createCommandIdempotency({
      processedCommandCache: { get: jest.fn().mockResolvedValue(null), set: jest.fn() },
      processedCommandRepository: {
        exists: jest.fn().mockResolvedValue(true),
        insert: jest.fn(),
      },
    });
    const dispatch = createIdempotentDispatchStreamCommand({
      dispatchStreamCommand: innerDispatch,
      commandIdempotency,
      publishStreamEvent: basePublish,
    });

    await dispatch({
      fields: {
        type: 'PlaceOrder',
        wamid: 'wamid.pg-only.001',
        correlationId: 'corr-pg',
        phone: '51999001001',
        timestamp: '2026-06-16T12:00:00.000Z',
        payload: '{}',
      },
    });

    expect(innerDispatch).not.toHaveBeenCalled();
    expect(basePublish).not.toHaveBeenCalled();
  });

  test('successful publish records wamid in cache and repository', async () => {
    const processedCommandCache = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
    };
    const processedCommandRepository = {
      exists: jest.fn().mockResolvedValue(false),
      insert: jest.fn().mockResolvedValue(undefined),
    };
    const commandIdempotency = createCommandIdempotency({
      processedCommandCache,
      processedCommandRepository,
    });
    const basePublish = jest.fn().mockResolvedValue(undefined);
    const publishStreamEvent = commandIdempotency.wrapPublishStreamEvent(basePublish);

    await publishStreamEvent(
      {
        type: 'PlaceOrder',
        wamid: 'wamid.record.001',
        correlationId: 'corr-record',
        phone: '51999001001',
        timestamp: '2026-06-16T12:00:00.000Z',
      },
      'OrderPlaced',
      { order: { id: 1 } },
    );

    expect(processedCommandRepository.insert).toHaveBeenCalledWith({
      wamid: 'wamid.record.001',
      tipoComando: 'PlaceOrder',
    });
    expect(processedCommandCache.set).toHaveBeenCalledWith('wamid.record.001', {
      eventType: 'OrderPlaced',
      payload: { order: { id: 1 } },
    });
  });
});
