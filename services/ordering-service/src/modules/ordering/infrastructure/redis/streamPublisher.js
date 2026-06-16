const { STREAM_ORDERING_EVENTS } = require('../../domain/messaging/streams');

/**
 * @typedef {object} DomainEventEnvelope
 * @property {string} type
 * @property {string} wamid
 * @property {string} correlationId
 * @property {string} phone
 * @property {string} timestamp
 * @property {string} [payload]
 */

/**
 * @typedef {object} EventPublisherPort
 * @property {(envelope: DomainEventEnvelope) => Promise<string>} publishEvent
 */

/**
 * @param {{ redis: import('redis').RedisClientType }} deps
 * @returns {EventPublisherPort}
 */
function createStreamPublisher({ redis }) {
  return {
    async publishEvent(envelope) {
      const fields = {
        type: envelope.type,
        wamid: envelope.wamid,
        correlationId: envelope.correlationId,
        phone: envelope.phone,
        timestamp: envelope.timestamp,
        payload: envelope.payload ?? '{}',
      };

      return redis.xAdd(STREAM_ORDERING_EVENTS, '*', fields);
    },
  };
}

module.exports = { createStreamPublisher };
