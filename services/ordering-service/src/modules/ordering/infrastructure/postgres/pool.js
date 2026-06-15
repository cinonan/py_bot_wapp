const { Pool } = require('pg');

function createPool(databaseUrl) {
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required');
  }

  return new Pool({ connectionString: databaseUrl });
}

module.exports = { createPool };
