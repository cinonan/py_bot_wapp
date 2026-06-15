const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const SEED_FILE = path.join(__dirname, '..', 'sql', 'seed.sql');

async function runSeed(databaseUrl) {
  const sql = fs.readFileSync(SEED_FILE, 'utf8');
  const pool = new Pool({ connectionString: databaseUrl });

  try {
    await pool.query(sql);
  } finally {
    await pool.end();
  }
}

module.exports = { runSeed };

if (require.main === module) {
  require('dotenv').config();

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL is required');
    process.exit(1);
  }

  runSeed(databaseUrl)
    .then(() => {
      console.log('Seed applied.');
    })
    .catch((error) => {
      console.error('Seed failed:', error.message);
      process.exit(1);
    });
}
