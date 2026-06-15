const {
  pingCommandSchema,
  parseStreamEnvelope,
} = require('../domain/messaging/messageSchemas');

function createHandleStreamCommand({ eventPublisher }) {
  async function handlePing(envelope) {
    await eventPublisher.publishEvent({
      type: 'Pong',
      wamid: envelope.wamid,
      correlationId: envelope.correlationId,
      phone: envelope.phone,
      timestamp: new Date().toISOString(),
      payload: '{}',
    });

    return true;
  }

  return async function handleStreamCommand({ fields }) {
    const envelope = parseStreamEnvelope(fields);

    switch (envelope.type) {
      case 'Ping':
        pingCommandSchema.parse(envelope);
        return handlePing(envelope);
      default:
        throw new Error(`Unknown command type: ${envelope.type}`);
    }
  };
}

module.exports = { createHandleStreamCommand };
