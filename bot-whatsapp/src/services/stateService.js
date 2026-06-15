const { createClient } = require('redis');

const SESSION_TTL_SECONDS = 60 * 60; // 1 hora
const KEY_PREFIX = 'session:user';
const CART_KEY_PREFIX = 'cart';

let redisClient = null;
let redisConnectPromise = null;

async function getRedisClient() {
  if (!redisClient) {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      throw new Error('REDIS_URL no está definida en variables de entorno.');
    }

    redisClient = createClient({
      url: redisUrl,
      socket: {
        connectTimeout: 10000,
      },
    });

    redisClient.on('error', (error) => {
      console.error('[Redis] connection error:', error.message);
    });
  }

  if (!redisClient.isOpen) {
    if (!redisConnectPromise) {
      redisConnectPromise = redisClient.connect().finally(() => {
        redisConnectPromise = null;
      });
    }
    await redisConnectPromise;
  }

  return redisClient;
}

function getSessionKey(phone) {
  return `${KEY_PREFIX}:${phone}`;
}

function getCartKey(phone) {
  return `${CART_KEY_PREFIX}:${phone}`;
}

/**
 * Retorna el estado actual del usuario.
 * @param {string} phone
 * @returns {Promise<string|null>} Ej: 'START', 'AWAITING_NAME' o null si no existe/error
 */
async function getUserState(phone) {
  try {
    const redis = await getRedisClient();
    const key = getSessionKey(phone);

    const raw = await redis.get(key);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    return parsed?.state || null;
  } catch (error) {
    console.error(`[stateService.getUserState] ${phone}:`, error.message);
    return null;
  }
}

/**
 * Retorna toda la sesión del usuario (state + metadata).
 * @param {string} phone
 * @returns {Promise<{state: string, metadata: object} | null>}
 */
async function getUserSession(phone) {
  try {
    const redis = await getRedisClient();
    const key = getSessionKey(phone);

    const raw = await redis.get(key);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    return {
      state: parsed?.state || null,
      metadata: parsed?.metadata || {},
    };
  } catch (error) {
    console.error(`[stateService.getUserSession] ${phone}:`, error.message);
    return null;
  }
}

/**
 * Guarda estado + metadata temporal del usuario y renueva TTL.
 * @param {string} phone
 * @param {string} state
 * @param {object} metadata
 * @returns {Promise<boolean>} true si se guardó, false en error
 */
async function setUserState(phone, state, metadata = {}) {
  try {
    const redis = await getRedisClient();
    const key = getSessionKey(phone);

    const payload = JSON.stringify({
      state,
      metadata,
      updatedAt: new Date().toISOString(),
    });

    await redis.set(key, payload, { EX: SESSION_TTL_SECONDS });
    return true;
  } catch (error) {
    console.error(`[stateService.setUserState] ${phone}:`, error.message);
    return false;
  }
}

/**
 * Elimina sesión de usuario en Redis.
 * @param {string} phone
 * @returns {Promise<boolean>} true si eliminó (o no existía), false en error
 */
async function clearUserState(phone) {
  try {
    const redis = await getRedisClient();
    const key = getSessionKey(phone);

    await redis.del(key);
    return true;
  } catch (error) {
    console.error(`[stateService.clearUserState] ${phone}:`, error.message);
    return false;
  }
}

/**
 * Agrega un item al carrito del usuario (snapshot de precio incluido).
 * @param {string} phone
 * @param {{id:number,nombre:string,precio:number,cantidad:number}} item
 * @returns {Promise<boolean>}
 */
async function addToCart(phone, item) {
  try {
    const redis = await getRedisClient();
    const key = getCartKey(phone);
    const currentCart = await getCart(phone);

    const normalizedItem = {
      id: Number(item.id),
      nombre: String(item.nombre),
      precio: Number(item.precio),
      cantidad: Number(item.cantidad),
    };

    const existingIndex = currentCart.findIndex(
      (cartItem) => Number(cartItem.id) === normalizedItem.id
    );

    if (existingIndex >= 0) {
      currentCart[existingIndex].cantidad =
        Number(currentCart[existingIndex].cantidad) + normalizedItem.cantidad;
    } else {
      currentCart.push(normalizedItem);
    }

    await redis.set(
      key,
      JSON.stringify({
        items: currentCart,
        updatedAt: new Date().toISOString(),
      }),
      { EX: SESSION_TTL_SECONDS }
    );

    return true;
  } catch (error) {
    console.error(`[stateService.addToCart] ${phone}:`, error.message);
    return false;
  }
}

/**
 * Recupera items actuales del carrito.
 * @param {string} phone
 * @returns {Promise<Array<{id:number,nombre:string,precio:number,cantidad:number}>>}
 */
async function getCart(phone) {
  try {
    const redis = await getRedisClient();
    const key = getCartKey(phone);
    const raw = await redis.get(key);

    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed?.items) ? parsed.items : [];
  } catch (error) {
    console.error(`[stateService.getCart] ${phone}:`, error.message);
    return [];
  }
}

/**
 * Limpia el carrito temporal del usuario.
 * @param {string} phone
 * @returns {Promise<boolean>}
 */
async function clearCart(phone) {
  try {
    const redis = await getRedisClient();
    const key = getCartKey(phone);
    await redis.del(key);
    return true;
  } catch (error) {
    console.error(`[stateService.clearCart] ${phone}:`, error.message);
    return false;
  }
}

module.exports = {
  addToCart,
  clearCart,
  getUserSession,
  getUserState,
  getCart,
  setUserState,
  clearUserState,
};