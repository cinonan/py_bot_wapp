function getStreamMaxRetries(env = process.env) {
  const parsed = Number(env.STREAM_MAX_RETRIES ?? 5);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return 5;
  }

  return Math.floor(parsed);
}

module.exports = { getStreamMaxRetries };
