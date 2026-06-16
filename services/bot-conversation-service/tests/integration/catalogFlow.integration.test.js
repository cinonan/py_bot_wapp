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

const TEST_ENV_FILE = path.join(__dirname, '.test-env.json');
const ORDERING_SERVICE_ROOT = path.join(__dirname, '..', '..', '..', 'ordering-service');
const ORDERING_COMPOSE_FILE = path.join(ORDERING_SERVICE_ROOT, 'docker-compose.test.yml');
const DEFAULT_DATABASE_URL =
  'postgresql://ordering_test:ordering_test@localhost:5433/ordering_test';

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

describe('catalog conversational integration', () => {
  let redisUrl;
  let databaseUrl;
  let adminRedis;
  let botDeps;
  let orderingDeps;
  let messageSender;
  const phone = '51999006010';

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
    });
    orderingDeps = createOrderingDependencies({ redisUrl, databaseUrl });

    await botDeps.redis.connect();
    await orderingDeps.redis.connect();
    await botDeps.streamEventConsumer.start();
    await orderingDeps.streamConsumer.start();

    await botDeps.streamCommandClient.sendPing({
      wamid: 'wamid.catalog.integration.warmup',
      phone: '51999006000',
    });
    await sleep(500);
  });

  afterAll(async () => {
    await botDeps.streamEventConsumer.shutdown();
    await orderingDeps.streamConsumer.shutdown();
    await botDeps.redis.quit();
    await orderingDeps.redis.quit();
    if (orderingDeps.pool) {
      await orderingDeps.pool.end();
    }
    await adminRedis.quit();
  });

  beforeEach(async () => {
    messageSender.sent.length = 0;
    await adminRedis.del(`${SESSION_KEY_PREFIX}:${phone}`);
  });

  async function simulateIncomingMessage({ phone, text, wamid }) {
    const result = await botDeps.handleConversationMessage({ phone, text, wamid });

    for (const reply of result.replies) {
      await messageSender.sendTextMessage(phone, reply);
    }

    return result;
  }

  async function seedIdentifiedSession() {
    await botDeps.sessionStore.set(phone, {
      state: CONVERSATION_STATE.CONFIRMING_ADDRESS,
      metadata: {
        name: 'Cliente Catálogo',
        savedAddress: 'Av. Catálogo 123',
        addressConfirmed: true,
      },
    });
  }

  test('seed to CatalogLoaded renders numbered menu with prices', async () => {
    await seedIdentifiedSession();

    await simulateIncomingMessage({
      phone,
      text: 'Ver Menú',
      wamid: 'wamid.catalog.integration.menu',
    });

    const session = await botDeps.sessionStore.get(phone);
    expect(session.state).toBe(CONVERSATION_STATE.SELECTING_PRODUCT);
    expect(session.metadata.catalogCache.length).toBeGreaterThan(0);

    const lastReply = messageSender.sent.at(-1);
    expect(lastReply.text).toMatch(/^\*Menú disponible:\*/);
    expect(lastReply.text).toMatch(/S\/ \d+\.\d{2}/);
  });

  test('second Ver Menú reuses cached catalog without republishing command', async () => {
    await seedIdentifiedSession();

    await simulateIncomingMessage({
      phone,
      text: 'Ver Menú',
      wamid: 'wamid.catalog.integration.menu.first',
    });

    const eventsAfterFirst = await orderingDeps.redis.xLen('bot:events');

    await simulateIncomingMessage({
      phone,
      text: 'Ver Menú',
      wamid: 'wamid.catalog.integration.menu.second',
    });

    const eventsAfterSecond = await orderingDeps.redis.xLen('bot:events');
    expect(eventsAfterSecond).toBe(eventsAfterFirst);
    expect(messageSender.sent.at(-1).text).toContain('Menú disponible');
  });

  test('invalid product id keeps user in selecting state', async () => {
    await botDeps.sessionStore.set(phone, {
      state: CONVERSATION_STATE.SELECTING_PRODUCT,
      metadata: {
        catalogCache: [{ id: 1, nombre: 'Arroz con pollo', precio: '18.50' }],
      },
    });

    await simulateIncomingMessage({
      phone,
      text: 'no-es-id',
      wamid: 'wamid.catalog.integration.invalid',
    });

    const session = await botDeps.sessionStore.get(phone);
    expect(session.state).toBe(CONVERSATION_STATE.SELECTING_PRODUCT);
    expect(messageSender.sent.at(-1).text).toContain('inválido');
  });
});
