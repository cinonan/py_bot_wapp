const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on('error', (err) => {
  console.error('Error inesperado en el pool de PostgreSQL:', err);
});

module.exports = { pool };
