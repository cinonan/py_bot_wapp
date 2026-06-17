const fs = require('fs');
const path = require('path');
const { createClient } = require('redis');
const { runMigrations } = require('../../../ordering-service/scripts/migrate');
const { runSeed } = require('../../../ordering-service/scripts/seed');
const { runDockerCompose } = require('../../../ordering-service/tests/integration/dockerCompose');
const { createTestDependencies: createBotDependencies } = require('../../src/composition/createTestDependencies');
const {
  createTestDependencies: createOrderingDependencies,
} = require('../../../ordering-service/src/composition/createTestDependencies');
const {
  createCollectingMessageSender,
} = require('../../src/modules/bot-conversation/infrastructure/messaging/messageSender');
const { CONVERSATION_STATE } = require('../../src/modules/bot-conversation/domain/conversation/states');
const { SESSION_KEY_PREFIX } = require('../../src/modules/bot-conversation/infrastructure/redis/sessionStore');
const { CART_KEY_PREFIX } = require('../../../ordering-service/src/modules/ordering/infrastructure/redis/cartStore');

const TEST_ENV_FILE = path.join(__dirname, '.test-env.json');
const ORDERING_SERVICE_ROOT = path.join(__dirname, '..', '..', '..', 'ordering-service');
const ORDERING_COMPOSE_FILE = path.join(ORDERING_SERVICE_ROOT, 'docker-compose.test.yml');
const DEFAULT_DATABASE_URL =
  'postgresql://ordering_test:ordering_test@localhost:5433/ordering_test';
const ADMIN_PHONE = '51999000099';

function getRedisUrl() {
  return JSON.parse(fs.readFileSync(TEST_ENV_FILE, 'utf8')).REDIS_URL;
}

async function ensurePostgresReady(databaseUrl) {
  if (process.env.INTEGRATION_DATABASE_URL) {
    return;
  }

  runDockerCompose(`-f "${ORDERING_COMPOSE_FILE}" up -d --wait postgres-test`, ORDERING_SERVICE_ROOT);
  const { createPool } = require('../../../ordering-service/src/modules/ordering/infrastructure/postgres/pool');
  const pool = createPool(databaseUrl);

  try {
    await pool.query('SELECT 1');
  } finally {
    await pool.end();
  }
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

describe('order placement conversational integration', () => {
  let redisUrl;
  let databaseUrl;
  let adminRedis;
  let pool;
  let botDeps;
  let orderingDeps;
  let messageSender;
  const phone = '51999007011';

  beforeAll(async () => {
    redisUrl = getRedisUrl();
    databaseUrl = process.env.INTEGRATION_DATABASE_URL || DEFAULT_DATABASE_URL;

    await ensurePostgresReady(databaseUrl);
    await runMigrations(databaseUrl);
    await runSeed(databaseUrl);

    adminRedis = createClient({ url: redisUrl });
    await adminRedis.connect();
    await adminRedis.flushDb();

    messageSender = createCollectingMessageSender();
    botDeps = createBotDependencies({
      redisUrl,
      replyTimeoutMs: 5000,
      messageSender,
      adminOrderNotifyPhone: ADMIN_PHONE,
    });
    orderingDeps = createOrderingDependencies({ redisUrl, databaseUrl });
    pool = orderingDeps.pool;

    await botDeps.redis.connect();
    await orderingDeps.redis.connect();
    await botDeps.streamEventConsumer.start();
    await orderingDeps.streamConsumer.start();

    await botDeps.streamCommandClient.sendPing({
      wamid: 'wamid.order.integration.warmup',
      phone: '51999007000',
    });
    await sleep(500);
  });

  afterAll(async () => {
    await botDeps.streamEventConsumer.shutdown();
    await orderingDeps.streamConsumer.shutdown();
    await botDeps.redis.quit();
    await orderingDeps.redis.quit();
    await pool.end();
    await adminRedis.quit();
  });

  beforeEach(async () => {
    messageSender.sent.length = 0;
    await adminRedis.del(`${SESSION_KEY_PREFIX}:${phone}`);
    await adminRedis.del(`${CART_KEY_PREFIX}:${phone}`);
    await pool.query('DELETE FROM pedido_historial_estados');
    await pool.query('DELETE FROM detalle_pedidos');
    await pool.query('DELETE FROM pedidos');
    await pool.query('DELETE FROM clientes WHERE telefono = $1', [phone]);
  });

  async function simulateIncomingMessage({ phone, text, wamid }) {
    const result = await botDeps.handleConversationMessage({ phone, text, wamid });

    for (const reply of result.replies) {
      await messageSender.sendTextMessage(phone, reply);
    }

    if (Array.isArray(result.notifications)) {
      for (const notification of result.notifications) {
        await messageSender.sendTextMessage(notification.phone, notification.text);
      }
    }

    return result;
  }

  test('confirming order without DNI places order, clears session/cart and notifies admin', async () => {
    await pool.query(
      `INSERT INTO clientes (telefono, nombre, direccion_principal)
       VALUES ($1, 'Cliente Order Flow', 'Av. Principal 100')`,
      [phone],
    );

    const product = await pool.query(
      'SELECT id FROM productos WHERE activo = true ORDER BY id ASC LIMIT 1',
    );

    await botDeps.streamCommandClient.addToCart({
      wamid: 'wamid.order.integration.cart',
      phone,
      productId: product.rows[0].id,
      cantidad: 1,
    });

    await botDeps.sessionStore.set(phone, {
      state: CONVERSATION_STATE.CONFIRMING_ORDER,
      metadata: {
        name: 'Cliente Order Flow',
        direccionEntrega: 'Av. Entrega 789',
        addressConfirmed: true,
      },
    });

    await simulateIncomingMessage({
      phone,
      text: 'No',
      wamid: 'wamid.order.integration.confirm',
    });

    expect(await botDeps.sessionStore.get(phone)).toBeNull();
    expect(await adminRedis.exists(`${CART_KEY_PREFIX}:${phone}`)).toBe(0);

    const orders = await pool.query('SELECT id, total, direccion_entrega FROM pedidos');
    expect(orders.rows).toHaveLength(1);
    expect(orders.rows[0].direccion_entrega).toBe('Av. Entrega 789');

    const customerMessage = messageSender.sent.find((entry) => entry.phone === phone);
    expect(customerMessage.text).toContain('Pedido #');
    expect(customerMessage.text).toContain('S/');

    const adminMessage = messageSender.sent.find((entry) => entry.phone === ADMIN_PHONE);
    expect(adminMessage.text).toContain('Cliente Order Flow');
    expect(adminMessage.text).toContain('Av. Entrega 789');
  });
});
