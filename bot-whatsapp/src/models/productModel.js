const { pool } = require('../config/db');

async function getAllProducts() {
  const query = 'SELECT id, nombre, precio FROM productos ORDER BY id ASC';
  const result = await pool.query(query);
  return result.rows;
}

async function getProductById(id) {
  const query = 'SELECT id, nombre, precio FROM productos WHERE id = $1';
  const result = await pool.query(query, [id]);
  return result.rows[0] || null;
}

module.exports = {
  getAllProducts,
  getProductById,
};
