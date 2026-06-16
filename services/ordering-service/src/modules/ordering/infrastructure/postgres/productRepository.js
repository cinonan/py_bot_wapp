/**
 * @typedef {object} ProductRecord
 * @property {number} id
 * @property {string} nombre
 * @property {string} precio
 */

/**
 * @typedef {object} ProductRepositoryPort
 * @property {() => Promise<ProductRecord[]>} findAllActive
 * @property {(productId: number) => Promise<ProductRecord|null>} findActiveById
 */

/**
 * @param {import('pg').Pool} pool
 * @returns {ProductRepositoryPort}
 */
function createProductRepository(pool) {
  return {
    async findAllActive() {
      const result = await pool.query(
        `SELECT id, nombre, precio::text AS precio
         FROM productos
         WHERE activo = true
         ORDER BY id ASC`,
      );

      return result.rows;
    },

    async findActiveById(productId) {
      const result = await pool.query(
        `SELECT id, nombre, precio::text AS precio
         FROM productos
         WHERE id = $1 AND activo = true`,
        [productId],
      );

      return result.rows[0] || null;
    },
  };
}

module.exports = { createProductRepository };
