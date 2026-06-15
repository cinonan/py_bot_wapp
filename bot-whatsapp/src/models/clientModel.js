const { pool } = require('../config/db');

async function findByPhone(phone) {
  const query = 'SELECT * FROM clientes WHERE telefono = $1';
  const result = await pool.query(query, [phone]);
  return result.rows[0] || null;
}

async function createClient(phone, name, address) {
  const query =
    'INSERT INTO clientes (telefono, nombre, direccion_principal) VALUES ($1, $2, $3) RETURNING *';
  const result = await pool.query(query, [phone, name, address]);
  return result.rows[0];
}

async function updateDni(phone, dni) {
  const query = 'UPDATE clientes SET dni = $1 WHERE telefono = $2 RETURNING *';
  const result = await pool.query(query, [dni, phone]);
  return result.rows[0] || null;
}

async function updateMainAddress(phone, address) {
  const query =
    'UPDATE clientes SET direccion_principal = $1 WHERE telefono = $2 RETURNING *';
  const result = await pool.query(query, [address, phone]);
  return result.rows[0] || null;
}

module.exports = {
  findByPhone,
  createClient,
  updateDni,
  updateMainAddress,
};
