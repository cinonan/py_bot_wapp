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
      const result = await pool.query(
        `INSERT INTO clientes (telefono, nombre, direccion_principal)
         VALUES ($1, $2, $3)
         RETURNING id, telefono, nombre, direccion_principal, dni`,
        [telefono, nombre, direccion_principal],
      );

      return result.rows[0];
    },
  };
}

module.exports = { createClientRepository };
