const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const { runDockerCompose } = require('./dockerCompose');

const SERVICE_ROOT = path.join(__dirname, '..', '..');
const COMPOSE_FILE = path.join(SERVICE_ROOT, 'docker-compose.test.yml');
const TEST_ENV_FILE = path.join(__dirname, '.test-env.json');
const DOCKER_DATABASE_URL =
  'postgresql://ordering_test:ordering_test@localhost:5433/ordering_test';

async function prepareExternalDatabase(databaseUrl) {
  const parsed = new URL(databaseUrl);
  const databaseName = parsed.pathname.replace(/^\//, '');
  const adminUrl = new URL(databaseUrl);
  adminUrl.pathname = '/postgres';

  const adminPool = new Pool({ connectionString: adminUrl.toString() });

  try {
    const existing = await adminPool.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [databaseName],
    );

    if (existing.rowCount > 0) {
      await adminPool.query(
        `SELECT pg_terminate_backend(pid)
         FROM pg_stat_activity
         WHERE datname = $1 AND pid <> pg_backend_pid()`,
        [databaseName],
      );
      await adminPool.query(`DROP DATABASE "${databaseName}"`);
    }

    await adminPool.query(`CREATE DATABASE "${databaseName}"`);
  } finally {
    await adminPool.end();
  }
}

module.exports = async () => {
  const externalDatabaseUrl = process.env.INTEGRATION_DATABASE_URL;

  if (externalDatabaseUrl) {
    await prepareExternalDatabase(externalDatabaseUrl);
    fs.writeFileSync(
      TEST_ENV_FILE,
      JSON.stringify({
        DATABASE_URL: externalDatabaseUrl,
        mode: 'external',
      }),
    );
    return;
  }

  runDockerCompose(`-f "${COMPOSE_FILE}" up -d --wait`, SERVICE_ROOT);

  fs.writeFileSync(
    TEST_ENV_FILE,
    JSON.stringify({
      DATABASE_URL: DOCKER_DATABASE_URL,
      mode: 'docker',
    }),
  );
};
