const { Pool } = require('pg');

function createPool(databaseUrl) {
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required');
  }

  const pool = new Pool({ connectionString: databaseUrl });
  pool.on('error', (error) => {
    console.error('PostgreSQL pool error:', error.message);
  });

  return pool;
}

module.exports = { createPool };
