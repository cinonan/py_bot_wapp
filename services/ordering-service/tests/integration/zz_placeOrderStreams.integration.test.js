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

describe('ordering-service PlaceOrder integration', () => {
  let pool;
  let redisUrl;
  let databaseUrl;
  let deps;
  let botDeps;
  let adminRedis;
  const phone = '51999007009';

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
    await pool.query('DELETE FROM pedido_historial_estados');
    await pool.query('DELETE FROM detalle_pedidos');
    await pool.query('DELETE FROM pedidos');
    await pool.query('DELETE FROM clientes WHERE telefono = $1', [phone]);
  });

  async function seedClientAndCart() {
    await pool.query(
      `INSERT INTO clientes (telefono, nombre, direccion_principal)
       VALUES ($1, 'Cliente PlaceOrder', 'Av. Principal 100')`,
      [phone],
    );

    const product = await pool.query(
      'SELECT id FROM productos WHERE activo = true ORDER BY id ASC LIMIT 1',
    );
    const productId = product.rows[0].id;

    await botDeps.streamCommandClient.addToCart({
      wamid: `wamid.placeorder.cart.${Date.now()}`,
      phone,
      productId,
      cantidad: 2,
    });

    return { productId };
  }

  test('PlaceOrder requires direccion_entrega and persists full order in PostgreSQL', async () => {
    await seedClientAndCart();

    const invalidResponse = await botDeps.streamCommandClient.placeOrder({
      wamid: 'wamid.placeorder.invalid',
      phone,
      payload: { direccion_entrega: 'abc' },
    });

    expect(invalidResponse.type).toBe('OrderPlaceFailed');

    const response = await botDeps.streamCommandClient.placeOrder({
      wamid: 'wamid.placeorder.success',
      phone,
      payload: {
        direccion_entrega: 'Av. Entrega 456, Lima',
        dni_facturacion: '87654321',
      },
    });

    expect(response.type).toBe('OrderPlaced');
    const payload = JSON.parse(response.payload);
    expect(payload.order.direccion_entrega).toBe('Av. Entrega 456, Lima');
    expect(payload.order.dni_facturacion).toBe('87654321');
    expect(payload.order.estado).toBe('pendiente');
    expect(payload.order.items.length).toBeGreaterThan(0);

    const orderRow = await pool.query(
      `SELECT id, total, estado, direccion_entrega, dni_facturacion
       FROM pedidos
       WHERE id = $1`,
      [payload.order.id],
    );
    expect(orderRow.rows[0]).toMatchObject({
      estado: 'pendiente',
      direccion_entrega: 'Av. Entrega 456, Lima',
      dni_facturacion: '87654321',
    });

    const detailRows = await pool.query(
      `SELECT id_producto, cantidad, precio_unitario, nombre_producto
       FROM detalle_pedidos
       WHERE id_pedido = $1`,
      [payload.order.id],
    );
    expect(detailRows.rows.length).toBe(payload.order.items.length);
    expect(detailRows.rows[0].nombre_producto).toBeTruthy();

    const historyRows = await pool.query(
      `SELECT estado_anterior, estado_nuevo, origen
       FROM pedido_historial_estados
       WHERE pedido_id = $1`,
      [payload.order.id],
    );
    expect(historyRows.rows[0]).toMatchObject({
      estado_anterior: null,
      estado_nuevo: 'pendiente',
      origen: 'PlaceOrder',
    });

    expect(await adminRedis.exists(`${CART_KEY_PREFIX}:${phone}`)).toBe(0);
  });

  test('UpdateClientDni updates client profile', async () => {
    await pool.query(
      `INSERT INTO clientes (telefono, nombre, direccion_principal)
       VALUES ($1, 'Cliente DNI', 'Av. Principal 100')`,
      [phone],
    );

    const response = await botDeps.streamCommandClient.updateClientDni({
      wamid: 'wamid.updatedni.success',
      phone,
      payload: { dni: '11223344' },
    });

    expect(response.type).toBe('ClientDniUpdated');
    const clientRow = await pool.query(
      'SELECT dni FROM clientes WHERE telefono = $1',
      [phone],
    );
    expect(clientRow.rows[0].dni).toBe('11223344');
  });
});
