const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const { createClient } = require('redis');
const { runSeed } = require('../../scripts/seed');
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

describe('ordering-service catalog commands integration', () => {
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
    await runSeed(databaseUrl);

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

  test('GetProductCatalog publishes CatalogLoaded with active seed products', async () => {
    const response = await botDeps.streamCommandClient.getProductCatalog({
      wamid: 'wamid.catalog.load.001',
      phone: '51999006001',
    });

    expect(response.type).toBe('CatalogLoaded');
    expect(response.timedOut).toBeUndefined();

    const payload = JSON.parse(response.payload);
    expect(payload.products.length).toBeGreaterThan(0);
    expect(payload.products.every((product) => product.nombre && product.precio)).toBe(true);

    const dbCount = await pool.query(
      'SELECT COUNT(*)::int AS count FROM productos WHERE activo = true',
    );
    expect(payload.products).toHaveLength(dbCount.rows[0].count);
  });

  test('GetProductById returns ProductResolved for active product', async () => {
    const activeProduct = await pool.query(
      'SELECT id FROM productos WHERE activo = true ORDER BY id ASC LIMIT 1',
    );

    const response = await botDeps.streamCommandClient.getProductById({
      wamid: 'wamid.catalog.product.hit',
      phone: '51999006002',
      productId: activeProduct.rows[0].id,
    });

    expect(response.type).toBe('ProductResolved');

    const payload = JSON.parse(response.payload);
    expect(payload.product.id).toBe(activeProduct.rows[0].id);
  });

  test('GetProductById returns ProductNotFound for inactive product', async () => {
    const inserted = await pool.query(
      `INSERT INTO productos (nombre, precio, activo)
       VALUES ('Producto inactivo test', 9.99, false)
       RETURNING id`,
    );

    const response = await botDeps.streamCommandClient.getProductById({
      wamid: 'wamid.catalog.product.inactive',
      phone: '51999006003',
      productId: inserted.rows[0].id,
    });

    expect(response.type).toBe('ProductNotFound');
  });

  test('GetProductById returns ProductNotFound for unknown product id', async () => {
    const response = await botDeps.streamCommandClient.getProductById({
      wamid: 'wamid.catalog.product.miss',
      phone: '51999006004',
      productId: 999999,
    });

    expect(response.type).toBe('ProductNotFound');
  });
});
