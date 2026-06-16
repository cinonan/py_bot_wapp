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
  createCollectingMessageSender,
} = require('../../src/modules/bot-conversation/infrastructure/messaging/messageSender');
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

describe('client registration conversational integration', () => {
  let redisUrl;
  let databaseUrl;
  let adminRedis;
  let botDeps;
  let orderingDeps;
  let messageSender;

  beforeAll(async () => {
    redisUrl = getRedisUrl();
    databaseUrl = process.env.INTEGRATION_DATABASE_URL || DEFAULT_DATABASE_URL;

    await ensurePostgresReady(databaseUrl);
    await runMigrations(databaseUrl);

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
      wamid: 'wamid.integration.warmup',
      phone: '51999000000',
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
    await orderingDeps.pool.query(
      'DELETE FROM clientes WHERE telefono = ANY($1::text[])',
      [['51999004010', '51999004011']],
    );
    await adminRedis.del(`${SESSION_KEY_PREFIX}:51999004010`);
    await adminRedis.del(`${SESSION_KEY_PREFIX}:51999004011`);
  });

  async function simulateIncomingMessage({ phone, text, wamid }) {
    const result = await botDeps.handleConversationMessage({ phone, text, wamid });

    for (const reply of result.replies) {
      await messageSender.sendTextMessage(phone, reply);
    }

    return result;
  }

  test('new client registration flow makes client retrievable via GetClientByPhone', async () => {
    const phone = '51999004010';

    await simulateIncomingMessage({
      phone,
      text: 'Hola',
      wamid: 'wamid.flow.001',
    });

    expect(messageSender.sent[0].text).toContain('registrarte');

    await simulateIncomingMessage({
      phone,
      text: 'María López',
      wamid: 'wamid.flow.002',
    });

    expect(messageSender.sent.at(-1).text).toContain('dirección principal');

    await simulateIncomingMessage({
      phone,
      text: 'Av. Selva 789, Lima',
      wamid: 'wamid.flow.003',
    });

    const lastMessages = messageSender.sent.slice(-2).map((entry) => entry.text);
    expect(lastMessages[0]).toContain('Registro completado');
    expect(lastMessages[1]).toContain('MISMA o NUEVA');

    const sessionRaw = await adminRedis.get(`${SESSION_KEY_PREFIX}:${phone}`);
    const session = JSON.parse(sessionRaw);
    expect(session.state).toBe('CONFIRMING_ADDRESS');

    const ttl = await adminRedis.ttl(`${SESSION_KEY_PREFIX}:${phone}`);
    expect(ttl).toBeGreaterThan(3500);
    expect(ttl).toBeLessThanOrEqual(3600);

    const lookup = await botDeps.streamCommandClient.getClientByPhone({
      wamid: 'wamid.flow.verify',
      phone,
    });

    expect(lookup.type).toBe('ClientFound');
    const payload = JSON.parse(lookup.payload);
    expect(payload.client).toMatchObject({
      telefono: phone,
      nombre: 'María López',
      direccion_principal: 'Av. Selva 789, Lima',
    });
  });

  test('returning client receives greeting by name and confirming address state', async () => {
    const phone = '51999004011';

    const seedResponse = await botDeps.streamCommandClient.registerClient({
      wamid: 'wamid.flow.seed',
      phone,
      payload: {
        nombre: 'Cliente Recurrente',
        direccion_principal: 'Jr. Antigua 100',
      },
    });
    expect(seedResponse.type).toBe('ClientRegistered');

    const verifyLookup = await botDeps.streamCommandClient.getClientByPhone({
      wamid: 'wamid.flow.seed.verify',
      phone,
    });
    expect(verifyLookup.type).toBe('ClientFound');

    await simulateIncomingMessage({
      phone,
      text: 'Buenos días',
      wamid: 'wamid.flow.returning.001',
    });

    expect(messageSender.sent[0].text).toContain('Cliente Recurrente');
    expect(messageSender.sent[0].text).toContain('MISMA o NUEVA');

    const sessionRaw = await adminRedis.get(`${SESSION_KEY_PREFIX}:${phone}`);
    const session = JSON.parse(sessionRaw);
    expect(session.state).toBe('CONFIRMING_ADDRESS');
    expect(session.metadata.name).toBe('Cliente Recurrente');
  });
});
