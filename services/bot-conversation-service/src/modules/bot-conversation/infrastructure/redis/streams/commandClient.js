const { randomUUID } = require('crypto');
const { STREAM_BOT_EVENTS } = require('../../../domain/messaging/constants');
const { messageMetadataSchema } = require('../../../domain/messaging/messageSchemas');
const { ReplyTimeoutError } = require('./replyRegistry');

/**
 * @typedef {object} StreamCommandPort
 * @property {(params: { wamid: string, phone: string }) => Promise<object>} sendPing
 * @property {(params: { wamid: string, phone: string }) => Promise<object>} getClientByPhone
 * @property {(params: { wamid: string, phone: string, payload: object }) => Promise<object>} registerClient
 * @property {(params: { wamid: string, phone: string }) => Promise<object>} getProductCatalog
 * @property {(params: { wamid: string, phone: string, productId: number }) => Promise<object>} getProductById
 */

/**
 * @param {{ redis: import('redis').RedisClientType, replyRegistry: object, replyTimeoutMs: number }} deps
 * @returns {StreamCommandPort & { sendCommand: Function }}
 */
function createStreamCommandClient({ redis, replyRegistry, replyTimeoutMs }) {
  return {
    async sendCommand({ type, metadata, payload = {} }) {
      const envelope = messageMetadataSchema.parse(metadata);
      const correlationId = envelope.correlationId;

      const replyPromise = replyRegistry.waitFor(correlationId, replyTimeoutMs);

      await redis.xAdd(STREAM_BOT_EVENTS, '*', {
        type,
        wamid: envelope.wamid,
        correlationId,
        phone: envelope.phone,
        timestamp: envelope.timestamp,
        payload: JSON.stringify(payload),
      });

      try {
        return await replyPromise;
      } catch (error) {
        if (error instanceof ReplyTimeoutError) {
          return {
            timedOut: true,
            waitingMessage: error.waitingMessage,
            correlationId,
          };
        }

        throw error;
      }
    },

    async sendPing({ wamid, phone }) {
      const correlationId = randomUUID();
      const timestamp = new Date().toISOString();

      return this.sendCommand({
        type: 'Ping',
        metadata: { wamid, correlationId, phone, timestamp },
        payload: {},
      });
    },

    async getClientByPhone({ wamid, phone }) {
      const correlationId = randomUUID();
      const timestamp = new Date().toISOString();

      return this.sendCommand({
        type: 'GetClientByPhone',
        metadata: { wamid, correlationId, phone, timestamp },
        payload: {},
      });
    },

    async registerClient({ wamid, phone, payload }) {
      const correlationId = randomUUID();
      const timestamp = new Date().toISOString();

      return this.sendCommand({
        type: 'RegisterClient',
        metadata: { wamid, correlationId, phone, timestamp },
        payload,
      });
    },

    async getProductCatalog({ wamid, phone }) {
      const correlationId = randomUUID();
      const timestamp = new Date().toISOString();

      return this.sendCommand({
        type: 'GetProductCatalog',
        metadata: { wamid, correlationId, phone, timestamp },
        payload: {},
      });
    },

    async getProductById({ wamid, phone, productId }) {
      const correlationId = randomUUID();
      const timestamp = new Date().toISOString();

      return this.sendCommand({
        type: 'GetProductById',
        metadata: { wamid, correlationId, phone, timestamp },
        payload: { productId },
      });
    },
  };
}

module.exports = { createStreamCommandClient };
