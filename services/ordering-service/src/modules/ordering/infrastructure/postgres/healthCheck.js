async function checkPostgresHealth(pool) {
  await pool.query('SELECT 1');
  return { postgres: 'connected' };
}

module.exports = { checkPostgresHealth };
