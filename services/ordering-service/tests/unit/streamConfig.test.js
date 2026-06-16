const { getStreamMaxRetries } = require('../../src/modules/ordering/domain/messaging/streamConfig');

describe('getStreamMaxRetries', () => {
  test('defaults to 5 when env is unset', () => {
    expect(getStreamMaxRetries({})).toBe(5);
  });

  test('reads STREAM_MAX_RETRIES from env', () => {
    expect(getStreamMaxRetries({ STREAM_MAX_RETRIES: '3' })).toBe(3);
  });

  test('falls back to 5 for invalid values', () => {
    expect(getStreamMaxRetries({ STREAM_MAX_RETRIES: '0' })).toBe(5);
    expect(getStreamMaxRetries({ STREAM_MAX_RETRIES: 'abc' })).toBe(5);
  });
});
