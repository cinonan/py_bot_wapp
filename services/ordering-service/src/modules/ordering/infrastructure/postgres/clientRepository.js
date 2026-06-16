const { DuplicateClientError } = require('../../domain/client/duplicateClientError');

/**
 * @typedef {object} ClientRecord
 * @property {number} id
 * @property {string} telefono
 * @property {string} nombre
 * @property {string} direccion_principal
 * @property {string|null} dni
 */

/**
 * @typedef {object} ClientRepositoryPort
 * @property {(telefono: string) => Promise<ClientRecord|null>} findByPhone
 * @property {(data: { telefono: string, nombre: string, direccion_principal: string }) => Promise<ClientRecord>} create
 */

/**
 * @param {import('pg').Pool} pool
 * @returns {ClientRepositoryPort}
 */
function createClientRepository(pool) {
  return {
    async findByPhone(telefono) {
      const result = await pool.query(
        `SELECT id, telefono, nombre, direccion_principal, dni
         FROM clientes
         WHERE telefono = $1`,
        [telefono],
      );

      return result.rows[0] || null;
    },

    async create({ telefono, nombre, direccion_principal }) {
      try {
        const result = await pool.query(
          `INSERT INTO clientes (telefono, nombre, direccion_principal)
           VALUES ($1, $2, $3)
           RETURNING id, telefono, nombre, direccion_principal, dni`,
          [telefono, nombre, direccion_principal],
        );

        return result.rows[0];
      } catch (error) {
        if (error && error.code === '23505') {
          throw new DuplicateClientError();
        }

        throw error;
      }
    },
  };
}

module.exports = { createClientRepository };
