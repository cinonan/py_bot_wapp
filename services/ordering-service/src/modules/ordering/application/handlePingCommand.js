const { pingCommandSchema } = require('../domain/messaging/messageSchemas');

function createHandlePingCommand({ publishStreamEvent }) {
  return async function handlePingCommand(envelope) {
    pingCommandSchema.parse(envelope);
    await publishStreamEvent(envelope, 'Pong', {});
    return true;
  };
}

module.exports = { createHandlePingCommand };
