const { ZodError } = require('zod');
const {
  pingCommandSchema,
  getClientByPhoneCommandSchema,
  registerClientCommandSchema,
  parseStreamEnvelope,
} = require('../domain/messaging/messageSchemas');

function createHandleStreamCommand({ eventPublisher, getClientByPhone, registerClient }) {
  async function publishEvent(envelope, eventType, payload) {
    await eventPublisher.publishEvent({
      type: eventType,
      wamid: envelope.wamid,
      correlationId: envelope.correlationId,
      phone: envelope.phone,
      timestamp: new Date().toISOString(),
      payload: JSON.stringify(payload),
    });
  }

  async function handlePing(envelope) {
    await publishEvent(envelope, 'Pong', {});
    return true;
  }

  async function handleGetClientByPhone(envelope) {
    getClientByPhoneCommandSchema.parse(envelope);
    const result = await getClientByPhone({ phone: envelope.phone });
    await publishEvent(envelope, result.eventType, result.payload);
    return true;
  }

  async function handleRegisterClient(envelope) {
    registerClientCommandSchema.parse(envelope);

    try {
      const result = await registerClient({
        phone: envelope.phone,
        payloadJson: envelope.payload,
      });
      await publishEvent(envelope, result.eventType, result.payload);
      return true;
    } catch (error) {
      if (error instanceof ZodError) {
        await publishEvent(envelope, 'RegisterClientFailed', {
          reason: 'validation',
          issues: error.issues.map((issue) => issue.message),
        });
        return true;
      }

      if (error && error.code === '23505') {
        await publishEvent(envelope, 'RegisterClientFailed', {
          reason: 'duplicate',
          message: 'Client already registered for this phone',
        });
        return true;
      }

      throw error;
    }
  }

  return async function handleStreamCommand({ fields }) {
    const envelope = parseStreamEnvelope(fields);

    switch (envelope.type) {
      case 'Ping':
        pingCommandSchema.parse(envelope);
        return handlePing(envelope);
      case 'GetClientByPhone':
        return handleGetClientByPhone(envelope);
      case 'RegisterClient':
        return handleRegisterClient(envelope);
      default:
        throw new Error(`Unknown command type: ${envelope.type}`);
    }
  };
}

module.exports = { createHandleStreamCommand };
