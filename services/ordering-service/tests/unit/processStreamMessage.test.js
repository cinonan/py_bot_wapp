const { ZodError } = require('zod');
const { createProcessStreamMessage } = require('../../src/modules/ordering/application/processStreamMessage');
const { TransientStreamError } = require('../../src/modules/ordering/domain/messaging/streamErrorClassification');

describe('processStreamMessage', () => {
  const baseFields = {
    type: 'RegisterClient',
    wamid: 'wamid.test.001',
    correlationId: 'corr-001',
    phone: '51999001001',
    timestamp: '2026-06-16T12:00:00.000Z',
    payload: JSON.stringify({ nombre: 'Test', direccion_principal: 'Av. Test 123' }),
  };

  function createHarness(overrides = {}) {
    const publishStreamEvent = jest.fn().mockResolvedValue(undefined);
    const publishToDlq = jest.fn().mockResolvedValue(undefined);
    const logger = {
      logTransientFailure: jest.fn(),
      logPermanentFailure: jest.fn(),
      logDlq: jest.fn(),
    };

    const processStreamMessage = createProcessStreamMessage({
      dispatchStreamCommand: overrides.dispatchStreamCommand || jest.fn().mockResolvedValue(undefined),
      publishStreamEvent,
      publishToDlq,
      maxRetries: overrides.maxRetries ?? 5,
      logger,
    });

    return { processStreamMessage, publishStreamEvent, publishToDlq, logger };
  }

  test('acks after successful dispatch', async () => {
    const { processStreamMessage } = createHarness();

    const result = await processStreamMessage({
      messageId: '1-0',
      fields: baseFields,
      deliveryCount: 1,
    });

    expect(result).toEqual({ ack: true });
  });

  test('does not ack transient errors', async () => {
    const { processStreamMessage, logger } = createHarness({
      dispatchStreamCommand: jest.fn().mockRejectedValue(new TransientStreamError('redis unavailable')),
    });

    const result = await processStreamMessage({
      messageId: '2-0',
      fields: baseFields,
      deliveryCount: 1,
    });

    expect(result).toEqual({ ack: false });
    expect(logger.logTransientFailure).toHaveBeenCalledWith(
      expect.objectContaining({
        correlationId: 'corr-001',
        wamid: 'wamid.test.001',
      }),
    );
  });

  test('acks and publishes failure event for validation errors', async () => {
    const { processStreamMessage, publishStreamEvent } = createHarness({
      dispatchStreamCommand: jest.fn().mockRejectedValue(new ZodError([])),
    });

    const result = await processStreamMessage({
      messageId: '3-0',
      fields: baseFields,
      deliveryCount: 1,
    });

    expect(result).toEqual({ ack: true });
    expect(publishStreamEvent).toHaveBeenCalledWith(
      expect.objectContaining({ correlationId: 'corr-001', wamid: 'wamid.test.001' }),
      'RegisterClientFailed',
      expect.objectContaining({ reason: 'validation' }),
    );
  });

  test('retries unclassified errors until max retries', async () => {
    const { processStreamMessage, publishToDlq } = createHarness({
      maxRetries: 5,
      dispatchStreamCommand: jest.fn().mockRejectedValue(new Error('unexpected')),
    });

    const result = await processStreamMessage({
      messageId: '4-0',
      fields: baseFields,
      deliveryCount: 4,
    });

    expect(result).toEqual({ ack: false });
    expect(publishToDlq).not.toHaveBeenCalled();
  });

  test('acks and copies to DLQ when unclassified retries are exhausted', async () => {
    const dispatchStreamCommand = jest.fn().mockRejectedValue(new Error('unexpected'));
    const { processStreamMessage, publishToDlq, logger } = createHarness({
      maxRetries: 5,
      dispatchStreamCommand,
    });

    const result = await processStreamMessage({
      messageId: '5-0',
      fields: baseFields,
      deliveryCount: 5,
    });

    expect(result).toEqual({ ack: true });
    expect(publishToDlq).toHaveBeenCalledWith(
      expect.objectContaining({
        messageId: '5-0',
        fields: baseFields,
      }),
    );
    expect(logger.logDlq).toHaveBeenCalledWith(
      expect.objectContaining({
        correlationId: 'corr-001',
        wamid: 'wamid.test.001',
      }),
    );
  });
});
