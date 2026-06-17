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

describe('ordering-service DispatchOrder integration', () => {
  let pool;
  let redisUrl;
  let databaseUrl;
  let deps;
  let botDeps;
  let adminRedis;
  const customerPhone = '51999007012';
  const adminPhone = '51999000012';

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
    botDeps = createBotDependencies({
      redisUrl,
      replyTimeoutMs: 5000,
      adminOrderNotifyPhone: adminPhone,
    });

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
    await adminRedis.del(`${CART_KEY_PREFIX}:${customerPhone}`);
    await pool.query('DELETE FROM pedido_historial_estados');
    await pool.query('DELETE FROM detalle_pedidos');
    await pool.query('DELETE FROM pedidos');
    await pool.query('DELETE FROM comandos_procesados');
    await pool.query('DELETE FROM clientes WHERE telefono = $1', [customerPhone]);
  });

  async function seedPendienteOrder() {
    const clientResult = await pool.query(
      `INSERT INTO clientes (telefono, nombre, direccion_principal)
       VALUES ($1, 'Cliente Dispatch', 'Av. Principal 100')
       RETURNING id`,
      [customerPhone],
    );
    const clienteId = clientResult.rows[0].id;

    const product = await pool.query(
      'SELECT id, precio, nombre FROM productos WHERE activo = true ORDER BY id ASC LIMIT 1',
    );
    const { id: productId, precio, nombre } = product.rows[0];

    const orderResult = await pool.query(
      `INSERT INTO pedidos (cliente_id, total, estado, direccion_entrega)
       VALUES ($1, $2, 'pendiente', 'Av. Entrega 456, Lima')
       RETURNING id`,
      [clienteId, precio],
    );
    const orderId = orderResult.rows[0].id;

    await pool.query(
      `INSERT INTO detalle_pedidos
         (id_pedido, id_producto, cantidad, precio_unitario, nombre_producto)
       VALUES ($1, $2, 1, $3, $4)`,
      [orderId, productId, precio, nombre],
    );

    await pool.query(
      `INSERT INTO pedido_historial_estados
         (pedido_id, estado_anterior, estado_nuevo, origen)
       VALUES ($1, NULL, 'pendiente', 'PlaceOrder')`,
      [orderId],
    );

    return { orderId, clienteId };
  }

  test('DispatchOrder transitions pendiente order to en_camino with historial', async () => {
    const { orderId } = await seedPendienteOrder();

    const response = await botDeps.streamCommandClient.dispatchOrder({
      wamid: 'wamid.dispatch.success',
      phone: adminPhone,
      payload: { orderId },
    });

    expect(response.type).toBe('OrderDispatched');
    const payload = JSON.parse(response.payload);
    expect(payload.order.id).toBe(orderId);
    expect(payload.order.estado).toBe('en_camino');
    expect(payload.client.telefono).toBe(customerPhone);

    const orderRow = await pool.query(
      'SELECT estado, fecha_atencion FROM pedidos WHERE id = $1',
      [orderId],
    );
    expect(orderRow.rows[0].estado).toBe('en_camino');
    expect(orderRow.rows[0].fecha_atencion).not.toBeNull();

    const historyRows = await pool.query(
      `SELECT estado_anterior, estado_nuevo, origen
       FROM pedido_historial_estados
       WHERE pedido_id = $1
       ORDER BY id ASC`,
      [orderId],
    );
    expect(historyRows.rows).toHaveLength(2);
    expect(historyRows.rows[1]).toMatchObject({
      estado_anterior: 'pendiente',
      estado_nuevo: 'en_camino',
      origen: 'DispatchOrder',
    });
  });

  test('DispatchOrder rejects non-pendiente order without side effects', async () => {
    const { orderId } = await seedPendienteOrder();

    await botDeps.streamCommandClient.dispatchOrder({
      wamid: 'wamid.dispatch.first',
      phone: adminPhone,
      payload: { orderId },
    });

    const secondResponse = await botDeps.streamCommandClient.dispatchOrder({
      wamid: 'wamid.dispatch.second',
      phone: adminPhone,
      payload: { orderId },
    });

    expect(secondResponse.type).toBe('OrderDispatchFailed');
    const payload = JSON.parse(secondResponse.payload);
    expect(payload.reason).toBe('invalid_state');
    expect(payload.currentState).toBe('en_camino');

    const historyRows = await pool.query(
      'SELECT COUNT(*)::int AS count FROM pedido_historial_estados WHERE pedido_id = $1',
      [orderId],
    );
    expect(historyRows.rows[0].count).toBe(2);
  });

  test('DispatchOrder returns order_not_found for missing order', async () => {
    const response = await botDeps.streamCommandClient.dispatchOrder({
      wamid: 'wamid.dispatch.missing',
      phone: adminPhone,
      payload: { orderId: 999999 },
    });

    expect(response.type).toBe('OrderDispatchFailed');
    const payload = JSON.parse(response.payload);
    expect(payload.reason).toBe('order_not_found');
  });
});
