const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const request = require('supertest');
const { runMigrations } = require('../../scripts/migrate');
const { runSeed } = require('../../scripts/seed');
const { createApp } = require('../../src/app');
const { createDependencies } = require('../../src/composition/createDependencies');

const TEST_ENV_FILE = path.join(__dirname, '.test-env.json');

function getTestEnv() {
  return JSON.parse(fs.readFileSync(TEST_ENV_FILE, 'utf8'));
}

function getTestDatabaseUrl() {
  return getTestEnv().DATABASE_URL;
}

describe('ordering-service persistence integration', () => {
  let pool;
  let databaseUrl;

  beforeAll(async () => {
    databaseUrl = getTestDatabaseUrl();
    pool = new Pool({ connectionString: databaseUrl });
  });

  afterAll(async () => {
    await pool.end();
  });

  test('applies versioned migrations on an empty database', async () => {
    const applied = await runMigrations(databaseUrl);

    const tables = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    expect(tables.rows.map((row) => row.table_name)).toEqual(
      expect.arrayContaining([
        'clientes',
        'comandos_procesados',
        'detalle_pedidos',
        'pedido_historial_estados',
        'pedidos',
        'productos',
        'schema_migrations',
      ]),
    );

    if (applied.length > 0) {
      expect(applied).toEqual(['001_initial_schema.sql']);
    }
  });

  test('runs seed twice without duplicating catalog rows', async () => {
    await runSeed(databaseUrl);
    const firstCount = await pool.query(
      'SELECT COUNT(*)::int AS count FROM productos WHERE activo = true',
    );

    await runSeed(databaseUrl);
    const secondCount = await pool.query(
      'SELECT COUNT(*)::int AS count FROM productos WHERE activo = true',
    );

    expect(firstCount.rows[0].count).toBeGreaterThan(0);
    expect(secondCount.rows[0].count).toBe(firstCount.rows[0].count);
  });

  test('enforces pedidos.cliente_id FK with ON DELETE RESTRICT', async () => {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const cliente = await client.query(
        `INSERT INTO clientes (telefono, nombre, direccion_principal)
         VALUES ('51999001001', 'Cliente Test', 'Av. Principal 123')
         RETURNING id`,
      );
      const clienteId = cliente.rows[0].id;

      await client.query(
        `INSERT INTO pedidos (cliente_id, total, estado, direccion_entrega)
         VALUES ($1, 25.00, 'pendiente', 'Av. Principal 123')`,
        [clienteId],
      );

      await expect(
        client.query('DELETE FROM clientes WHERE id = $1', [clienteId]),
      ).rejects.toMatchObject({ code: '23503' });

      await client.query('ROLLBACK');
    } finally {
      client.release();
    }
  });

  test('restricts pedidos.estado to pendiente, en_camino, entregado', async () => {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const cliente = await client.query(
        `INSERT INTO clientes (telefono, nombre, direccion_principal)
         VALUES ('51999001002', 'Cliente Estado', 'Jr. Lima 456')
         RETURNING id`,
      );

      await expect(
        client.query(
          `INSERT INTO pedidos (cliente_id, total, estado, direccion_entrega)
           VALUES ($1, 10.00, 'cancelado', 'Jr. Lima 456')`,
          [cliente.rows[0].id],
        ),
      ).rejects.toMatchObject({ code: '23514' });

      await client.query('ROLLBACK');
    } finally {
      client.release();
    }
  });

  test('stores product snapshots and generated monto_total in detalle_pedidos', async () => {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const cliente = await client.query(
        `INSERT INTO clientes (telefono, nombre, direccion_principal)
         VALUES ('51999001003', 'Cliente Detalle', 'Calle Sur 789')
         RETURNING id`,
      );
      const producto = await client.query(
        `SELECT id FROM productos WHERE activo = true LIMIT 1`,
      );

      const pedido = await client.query(
        `INSERT INTO pedidos (cliente_id, total, estado, direccion_entrega)
         VALUES ($1, 36.00, 'pendiente', 'Calle Sur 789')
         RETURNING id`,
        [cliente.rows[0].id],
      );

      const detalle = await client.query(
        `INSERT INTO detalle_pedidos
           (id_pedido, id_producto, cantidad, precio_unitario, nombre_producto)
         VALUES ($1, $2, 2, 18.00, 'Arroz con pollo')
         RETURNING precio_unitario, nombre_producto, monto_total`,
        [pedido.rows[0].id, producto.rows[0].id],
      );

      expect(detalle.rows[0]).toMatchObject({
        nombre_producto: 'Arroz con pollo',
        precio_unitario: '18.00',
        monto_total: '36.00',
      });

      await client.query('ROLLBACK');
    } finally {
      client.release();
    }
  });

  test('creates pedido_historial_estados and comandos_procesados with useful indexes', async () => {
    const historialIndexes = await pool.query(`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename = 'pedido_historial_estados'
    `);
    const comandosIndexes = await pool.query(`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename = 'comandos_procesados'
    `);

    expect(historialIndexes.rows.map((row) => row.indexname)).toEqual(
      expect.arrayContaining([
        'idx_pedido_historial_pedido_id',
        'idx_pedido_historial_registrado_en',
      ]),
    );
    expect(comandosIndexes.rows.map((row) => row.indexname)).toEqual(
      expect.arrayContaining(['idx_comandos_procesados_procesado_en']),
    );
  });

  test('returns HTTP 200 from /health when PostgreSQL is accessible', async () => {
    const { REDIS_URL: redisUrl } = getTestEnv();
    const deps = createDependencies({ databaseUrl, redisUrl });
    const app = createApp(deps);

    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: 'ok',
      postgres: 'connected',
    });

    await deps.pool.end();
    if (deps.redis.isOpen) {
      await deps.redis.quit();
    }
  });
});
