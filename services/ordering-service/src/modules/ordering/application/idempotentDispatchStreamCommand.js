const { parseStreamEnvelope } = require('../domain/messaging/messageSchemas');

/**
 * @param {{
 *   dispatchStreamCommand: (params: { fields: object }) => Promise<unknown>,
 *   commandIdempotency: { findDuplicate: Function },
 *   publishStreamEvent: Function,
 * }} deps
 */
function createIdempotentDispatchStreamCommand({
  dispatchStreamCommand,
  commandIdempotency,
  publishStreamEvent,
}) {
  return async function idempotentDispatchStreamCommand({ fields }) {
    const envelope = parseStreamEnvelope(fields);
    const duplicate = await commandIdempotency.findDuplicate(envelope.wamid);

    if (duplicate.duplicate) {
      if (duplicate.cached) {
        await publishStreamEvent(
          envelope,
          duplicate.cached.eventType,
          duplicate.cached.payload,
        );
      }
      return true;
    }

    return dispatchStreamCommand({ fields });
  };
}

module.exports = { createIdempotentDispatchStreamCommand };
