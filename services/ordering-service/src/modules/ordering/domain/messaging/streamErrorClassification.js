const { ZodError } = require('zod');

class TransientStreamError extends Error {
  constructor(message) {
    super(message);
    this.name = 'TransientStreamError';
  }
}

class UnknownCommandError extends Error {
  constructor(commandType) {
    super(`Unknown command type: ${commandType}`);
    this.name = 'UnknownCommandError';
    this.commandType = commandType;
  }
}

const TRANSIENT_PG_CODES = new Set(['40P01', '57P01', '53300', '08006', '08001']);
const TRANSIENT_NETWORK_CODES = new Set(['ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'EAI_AGAIN']);

function classifyStreamProcessingError(error) {
  if (error instanceof ZodError || error instanceof UnknownCommandError) {
    return 'permanent_validation';
  }

  if (error instanceof TransientStreamError) {
    return 'transient';
  }

  if (error && TRANSIENT_PG_CODES.has(error.code)) {
    return 'transient';
  }

  if (error && TRANSIENT_NETWORK_CODES.has(error.code)) {
    return 'transient';
  }

  const message = String(error?.message || '').toLowerCase();

  if (
    message.includes('timeout') ||
    message.includes('deadlock') ||
    message.includes('connection terminated') ||
    message.includes('redis')
  ) {
    return 'transient';
  }

  return 'unclassified';
}

module.exports = {
  TransientStreamError,
  UnknownCommandError,
  classifyStreamProcessingError,
};
