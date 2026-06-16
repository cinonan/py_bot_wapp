const { ZodError } = require('zod');
const {
  classifyStreamProcessingError,
  TransientStreamError,
  UnknownCommandError,
} = require('../../src/modules/ordering/domain/messaging/streamErrorClassification');

describe('classifyStreamProcessingError', () => {
  test('classifies Zod validation errors as permanent_validation', () => {
    const error = new ZodError([]);

    expect(classifyStreamProcessingError(error)).toBe('permanent_validation');
  });

  test('classifies unknown command errors as permanent_validation', () => {
    const error = new UnknownCommandError('FooBar');

    expect(classifyStreamProcessingError(error)).toBe('permanent_validation');
  });

  test('classifies TransientStreamError as transient', () => {
    const error = new TransientStreamError('database timeout');

    expect(classifyStreamProcessingError(error)).toBe('transient');
  });

  test('classifies PostgreSQL deadlock as transient', () => {
    const error = new Error('deadlock detected');
    error.code = '40P01';

    expect(classifyStreamProcessingError(error)).toBe('transient');
  });

  test('classifies connection timeouts as transient', () => {
    const error = new Error('connect ETIMEDOUT');
    error.code = 'ETIMEDOUT';

    expect(classifyStreamProcessingError(error)).toBe('transient');
  });

  test('classifies unhandled errors as unclassified', () => {
    const error = new Error('unexpected bug');

    expect(classifyStreamProcessingError(error)).toBe('unclassified');
  });
});
