const fs = require('fs');
const path = require('path');
const { createClient } = require('redis');
const { runMigrations } = require('../../../ordering-service/scripts/migrate');
const { runDockerCompose } = require('../../../ordering-service/tests/integration/dockerCompose');
const { createTestDependencies: createBotDependencies } = require('../../src/composition/createTestDependencies');
const {
  createTestDependencies: createOrderingDependencies,
} = require('../../../ordering-service/src/composition/createTestDependencies');
const {
  STREAM_BOT_EVENTS,
  STREAM_ORDERING_EVENTS,
  CONSUMER_GROUP_ORDERING,
  CONSUMER_GROUP_BOT,
} = require('../../../ordering-service/src/modules/ordering/domain/messaging/streams');

const TEST_ENV_FILE = path.join(__dirname, '.test-env.json');
const ORDERING_SERVICE_ROOT = path.join(__dirname, '..', '..', '..', 'ordering-service');
const ORDERING_TEST_ENV_FILE = path.join(ORDERING_SERVICE_ROOT, 'tests', 'integration', '.test-env.json');
const ORDERING_COMPOSE_FILE = path.join(ORDERING_SERVICE_ROOT, 'docker-compose.test.yml');
const DEFAULT_ORDERING_DATABASE_URL =
  'postgresql://ordering_test:ordering_test@localhost:5433/ordering_test';

function getTestRedisUrl() {
  const env = JSON.parse(fs.readFileSync(TEST_ENV_FILE, 'utf8'));
  return env.REDIS_URL;
}

function getOrderingDatabaseUrl() {
  if (process.env.INTEGRATION_DATABASE_URL) {
    return process.env.INTEGRATION_DATABASE_URL;
  }

  if (fs.existsSync(ORDERING_TEST_ENV_FILE)) {
    const env = JSON.parse(fs.readFileSync(ORDERING_TEST_ENV_FILE, 'utf8'));
    if (env.DATABASE_URL) {
      return env.DATABASE_URL;
    }
  }

  return DEFAULT_ORDERING_DATABASE_URL;
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

describe('Redis Streams request-reply integration', () => {
  let redisUrl;
  let adminRedis;
  let botDeps;
  let orderingDeps;

  beforeAll(async () => {
    redisUrl = getTestRedisUrl();
    const databaseUrl = getOrderingDatabaseUrl();

    await ensurePostgresReady(databaseUrl);
    await runMigrations(databaseUrl);

    adminRedis = createClient({ url: redisUrl });
    await adminRedis.connect();
    await adminRedis.flushDb();

    botDeps = createBotDependencies({
      redisUrl,
      replyTimeoutMs: 5000,
    });
    orderingDeps = createOrderingDependencies({
      redisUrl,
      databaseUrl,
    });

    await botDeps.redis.connect();
    await orderingDeps.redis.connect();

    await orderingDeps.pool.query('DELETE FROM comandos_procesados');

    await botDeps.streamEventConsumer.start();
    await orderingDeps.streamConsumer.start();

    await botDeps.streamCommandClient.sendPing({
      wamid: `wamid.streams.integration.warmup.${Date.now()}`,
      phone: '51999001000',
    });
    await sleep(500);
  });

  afterAll(async () => {
    await botDeps.streamEventConsumer.shutdown();
    await orderingDeps.streamConsumer.shutdown();
    await botDeps.redis.quit();
    await orderingDeps.redis.quit();
    await orderingDeps.pool.end();
    await adminRedis.quit();
  });

  test('creates streams with operational consumer groups', async () => {
    const botGroups = await adminRedis.xInfoGroups(STREAM_BOT_EVENTS);
    const orderingGroups = await adminRedis.xInfoGroups(STREAM_ORDERING_EVENTS);

    expect(botGroups.map((group) => group.name)).toContain(CONSUMER_GROUP_ORDERING);
    expect(orderingGroups.map((group) => group.name)).toContain(CONSUMER_GROUP_BOT);
  });

  test('round-trips Ping to Pong with required metadata and correlationId', async () => {
    const wamid = 'wamid.integration.ping.001';
    const phone = '51999001001';

    const response = await botDeps.streamCommandClient.sendPing({ wamid, phone });

    expect(response.timedOut).toBeUndefined();
    expect(response.type).toBe('Pong');
    expect(response.wamid).toBe(wamid);
    expect(response.phone).toBe(phone);
    expect(response.correlationId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
    expect(response.timestamp).toBeTruthy();
    expect(response.payload).toBe('{}');
  });

  test('returns waiting message on reply timeout without failing the call', async () => {
    await orderingDeps.streamConsumer.shutdown();

    const response = await botDeps.streamCommandClient.sendPing({
      wamid: 'wamid.integration.timeout.001',
      phone: '51999001002',
    });

    expect(response.timedOut).toBe(true);
    expect(response.waitingMessage).toContain('espera');
    expect(response.correlationId).toBeTruthy();

    await orderingDeps.streamConsumer.start();
    await sleep(300);
  });

  test('XACKs bot command only after successful processing', async () => {
    const wamid = 'wamid.integration.ack.001';
    const phone = '51999001003';

    await botDeps.streamCommandClient.sendPing({ wamid, phone });
    await sleep(500);

    const pending = await adminRedis.xPending(STREAM_BOT_EVENTS, CONSUMER_GROUP_ORDERING);
    expect(Number(pending.pending)).toBe(0);
  });
});
