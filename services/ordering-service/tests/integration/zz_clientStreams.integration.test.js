const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const { createClient } = require('redis');
const { createTestDependencies } = require('../../src/composition/createTestDependencies');

const TEST_ENV_FILE = path.join(__dirname, '.test-env.json');

function getTestEnv() {
  return JSON.parse(fs.readFileSync(TEST_ENV_FILE, 'utf8'));
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

describe('ordering-service client commands integration', () => {
  let pool;
  let redisUrl;
  let databaseUrl;
  let deps;
  let botDeps;

  beforeAll(async () => {
    const env = getTestEnv();
    databaseUrl = env.DATABASE_URL;
    redisUrl = env.REDIS_URL;

    pool = new Pool({ connectionString: databaseUrl });

    const adminRedis = createClient({ url: redisUrl });
    await adminRedis.connect();
    await adminRedis.flushDb();
    await adminRedis.quit();

    deps = createTestDependencies({ databaseUrl, redisUrl });
    const {
      createTestDependencies: createBotDependencies,
    } = require('../../../bot-conversation-service/src/composition/createTestDependencies');
    botDeps = createBotDependencies({ redisUrl, replyTimeoutMs: 5000 });

    await deps.redis.connect();
    await botDeps.redis.connect();
    await botDeps.streamEventConsumer.start();
    await deps.streamConsumer.start();
    await sleep(300);
  });

  afterAll(async () => {
    await botDeps.streamEventConsumer.shutdown();
    await deps.streamConsumer.shutdown();
    await botDeps.redis.quit();
    await deps.redis.quit();
    await deps.pool.end();
    await pool.end();
  });

  beforeEach(async () => {
    await pool.query('DELETE FROM clientes WHERE telefono LIKE $1', ['51999004%']);
  });

  test('GetClientByPhone returns ClientNotFound for unknown phone', async () => {
    const response = await botDeps.streamCommandClient.getClientByPhone({
      wamid: 'wamid.client.lookup.miss',
      phone: '51999004001',
    });

    expect(response.type).toBe('ClientNotFound');
    expect(response.timedOut).toBeUndefined();
  });

  test('RegisterClient persists client and GetClientByPhone returns ClientFound', async () => {
    const phone = '51999004002';

    const registerResponse = await botDeps.streamCommandClient.registerClient({
      wamid: 'wamid.client.register.001',
      phone,
      payload: {
        nombre: 'Cliente Integración',
        direccion_principal: 'Av. Integración 456',
      },
    });

    expect(registerResponse.type).toBe('ClientRegistered');

    const lookupResponse = await botDeps.streamCommandClient.getClientByPhone({
      wamid: 'wamid.client.lookup.hit',
      phone,
    });

    expect(lookupResponse.type).toBe('ClientFound');

    const payload = JSON.parse(lookupResponse.payload);
    expect(payload.client).toMatchObject({
      telefono: phone,
      nombre: 'Cliente Integración',
      direccion_principal: 'Av. Integración 456',
    });

    const row = await pool.query('SELECT nombre FROM clientes WHERE telefono = $1', [phone]);
    expect(row.rows[0].nombre).toBe('Cliente Integración');
  });
});
