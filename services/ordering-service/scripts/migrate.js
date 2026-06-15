const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const MIGRATIONS_DIR = path.join(__dirname, '..', 'sql', 'migrations');

async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version VARCHAR(64) PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function getAppliedVersions(client) {
  const result = await client.query('SELECT version FROM schema_migrations ORDER BY version');
  return new Set(result.rows.map((row) => row.version));
}

function listMigrationFiles() {
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith('.sql'))
    .sort();
}

async function applyMigration(client, filename) {
  const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, filename), 'utf8');
  await client.query('BEGIN');
  try {
    await client.query(sql);
    await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [filename]);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

async function runMigrations(databaseUrl) {
  const pool = new Pool({ connectionString: databaseUrl });
  const client = await pool.connect();

  try {
    await ensureMigrationsTable(client);
    const applied = await getAppliedVersions(client);
    const pending = listMigrationFiles().filter((file) => !applied.has(file));

    for (const file of pending) {
      await applyMigration(client, file);
    }

    return pending;
  } finally {
    client.release();
    await pool.end();
  }
}

module.exports = { runMigrations };

if (require.main === module) {
  require('dotenv').config();

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL is required');
    process.exit(1);
  }

  runMigrations(databaseUrl)
    .then((applied) => {
      if (applied.length === 0) {
        console.log('No pending migrations.');
      } else {
        console.log(`Applied migrations: ${applied.join(', ')}`);
      }
    })
    .catch((error) => {
      console.error('Migration failed:', error.message);
      process.exit(1);
    });
}
