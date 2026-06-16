const CART_TTL_SECONDS = 60 * 60;
const CART_KEY_PREFIX = 'ordering:cart';

/**
 * @typedef {object} CartItem
 * @property {number} productId
 * @property {number} cantidad
 * @property {string} precio_unitario
 * @property {string} nombre_producto
 */

/**
 * @typedef {object} CartStorePort
 * @property {(phone: string) => Promise<CartItem[]>} getItems
 * @property {(phone: string, items: CartItem[]) => Promise<void>} saveItems
 * @property {(phone: string) => Promise<void>} clear
 */

/**
 * @param {{ redis: import('redis').RedisClientType, ttlSeconds?: number }} deps
 * @returns {CartStorePort}
 */
function createCartStore({ redis, ttlSeconds = CART_TTL_SECONDS }) {
  function cartKey(phone) {
    return `${CART_KEY_PREFIX}:${phone}`;
  }

  return {
    async getItems(phone) {
      const raw = await redis.get(cartKey(phone));
      if (!raw) {
        return [];
      }

      const parsed = JSON.parse(raw);
      return Array.isArray(parsed.items) ? parsed.items : [];
    },

    async saveItems(phone, items) {
      await redis.set(
        cartKey(phone),
        JSON.stringify({ items, updatedAt: new Date().toISOString() }),
        { EX: ttlSeconds },
      );
    },

    async clear(phone) {
      await redis.del(cartKey(phone));
    },

    getTtlSeconds() {
      return ttlSeconds;
    },
  };
}

module.exports = { createCartStore, CART_TTL_SECONDS, CART_KEY_PREFIX };
