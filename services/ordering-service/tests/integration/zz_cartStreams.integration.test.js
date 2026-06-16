const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const { createClient } = require('redis');
const { runSeed } = require('../../scripts/seed');
const { createTestDependencies } = require('../../src/composition/createTestDependencies');
const { CART_KEY_PREFIX } = require('../../src/modules/ordering/infrastructure/redis/cartStore');

const TEST_ENV_FILE = path.join(__dirname, '.test-env.json');

function getTestEnv() {
  return JSON.parse(fs.readFileSync(TEST_ENV_FILE, 'utf8'));
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

describe('ordering-service cart commands integration', () => {
  let pool;
  let redisUrl;
  let databaseUrl;
  let deps;
  let botDeps;
  let adminRedis;
  const phone = '51999007001';

  beforeAll(async () => {
    const env = getTestEnv();
    databaseUrl = env.DATABASE_URL;
    redisUrl = env.REDIS_URL;

    pool = new Pool({ connectionString: databaseUrl });
    await runSeed(databaseUrl);

    adminRedis = createClient({ url: redisUrl });
    await adminRedis.connect();
    await adminRedis.flushDb();

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
    await adminRedis.quit();
    await deps.pool.end();
    await pool.end();
  });

  beforeEach(async () => {
    await adminRedis.del(`${CART_KEY_PREFIX}:${phone}`);
  });

  test('AddToCart freezes snapshot even if product price changes afterwards', async () => {
    const inserted = await pool.query(
      `INSERT INTO productos (nombre, precio, activo)
       VALUES ('Producto snapshot cart test', 12.00, true)
       RETURNING id`,
    );
    const productId = inserted.rows[0].id;

    const addResponse = await botDeps.streamCommandClient.addToCart({
      wamid: 'wamid.cart.snapshot.add',
      phone,
      productId,
      cantidad: 2,
    });

    expect(addResponse.type).toBe('CartUpdated');
    const addPayload = JSON.parse(addResponse.payload);
    expect(addPayload.items).toHaveLength(1);
    expect(addPayload.items[0]).toMatchObject({
      productId,
      cantidad: 2,
      precio_unitario: '12.00',
      nombre_producto: 'Producto snapshot cart test',
    });
    expect(addPayload.subtotal).toBe('24.00');

    await pool.query('UPDATE productos SET precio = 99.99 WHERE id = $1', [productId]);

    const getResponse = await botDeps.streamCommandClient.getCart({
      wamid: 'wamid.cart.snapshot.get',
      phone,
    });

    const getPayload = JSON.parse(getResponse.payload);
    expect(getPayload.items[0].precio_unitario).toBe('12.00');
    expect(getPayload.subtotal).toBe('24.00');
  });

  test('AddToCart merges quantities for same productId', async () => {
    const activeProduct = await pool.query(
      'SELECT id FROM productos WHERE activo = true ORDER BY id ASC LIMIT 1',
    );
    const productId = activeProduct.rows[0].id;

    await botDeps.streamCommandClient.addToCart({
      wamid: 'wamid.cart.merge.first',
      phone,
      productId,
      cantidad: 1,
    });

    const secondResponse = await botDeps.streamCommandClient.addToCart({
      wamid: 'wamid.cart.merge.second',
      phone,
      productId,
      cantidad: 3,
    });

    const payload = JSON.parse(secondResponse.payload);
    expect(payload.items).toHaveLength(1);
    expect(payload.items[0].cantidad).toBe(4);
  });

  test('AddToCart rejects invalid quantity without clearing cart', async () => {
    const activeProduct = await pool.query(
      'SELECT id FROM productos WHERE activo = true ORDER BY id ASC LIMIT 1',
    );
    const productId = activeProduct.rows[0].id;

    await botDeps.streamCommandClient.addToCart({
      wamid: 'wamid.cart.invalid.seed',
      phone,
      productId,
      cantidad: 1,
    });

    const failedResponse = await botDeps.streamCommandClient.addToCart({
      wamid: 'wamid.cart.invalid.qty',
      phone,
      productId,
      cantidad: 0,
    });

    expect(failedResponse.type).toBe('AddToCartFailed');

    const cartResponse = await botDeps.streamCommandClient.getCart({
      wamid: 'wamid.cart.invalid.get',
      phone,
    });
    const cartPayload = JSON.parse(cartResponse.payload);
    expect(cartPayload.items).toHaveLength(1);
    expect(cartPayload.items[0].cantidad).toBe(1);
  });
});
