const { createPool } = require('../modules/ordering/infrastructure/postgres/pool');

function createDependencies(config = {}) {
  const databaseUrl = config.databaseUrl || process.env.DATABASE_URL;

  return {
    pool: createPool(databaseUrl),
  };
}

module.exports = { createDependencies };
