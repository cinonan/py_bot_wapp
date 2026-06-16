/**
 * @typedef {import('../infrastructure/redis/streamPublisher').EventPublisherPort} EventPublisherPort
 */

/**
 * @param {EventPublisherPort} eventPublisher
 */
function createPublishStreamEvent(eventPublisher) {
  return async function publishStreamEvent(envelope, eventType, payload) {
    await eventPublisher.publishEvent({
      type: eventType,
      wamid: envelope.wamid,
      correlationId: envelope.correlationId,
      phone: envelope.phone,
      timestamp: new Date().toISOString(),
      payload: JSON.stringify(payload),
    });
  };
}

module.exports = { createPublishStreamEvent };
