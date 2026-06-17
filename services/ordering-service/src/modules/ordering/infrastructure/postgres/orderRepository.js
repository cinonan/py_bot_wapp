/**
 * @typedef {object} OrderLineInput
 * @property {number} productId
 * @property {number} cantidad
 * @property {string} precio_unitario
 * @property {string} nombre_producto
 */

/**
 * @typedef {object} CreatedOrder
 * @property {number} id
 * @property {number} cliente_id
 * @property {string} total
 * @property {string} estado
 * @property {string} direccion_entrega
 * @property {string|null} dni_facturacion
 */

/**
 * @typedef {object} OrderRepositoryPort
 * @property {(data: {
 *   clienteId: number,
 *   direccion_entrega: string,
 *   dni_facturacion: string|null,
 *   total: string,
 *   items: OrderLineInput[],
 * }) => Promise<CreatedOrder>} createWithDetails
 */

/**
 * @param {import('pg').Pool} pool
 * @returns {OrderRepositoryPort}
 */
function createOrderRepository(pool) {
  return {
    async createWithDetails({
      clienteId,
      direccion_entrega,
      dni_facturacion,
      total,
      items,
    }) {
      const client = await pool.connect();

      try {
        await client.query('BEGIN');

        const orderResult = await client.query(
          `INSERT INTO pedidos (cliente_id, total, estado, direccion_entrega, dni_facturacion)
           VALUES ($1, $2, 'pendiente', $3, $4)
           RETURNING id, cliente_id, total, estado, direccion_entrega, dni_facturacion`,
          [clienteId, total, direccion_entrega, dni_facturacion],
        );

        const order = orderResult.rows[0];

        for (const item of items) {
          await client.query(
            `INSERT INTO detalle_pedidos
               (id_pedido, id_producto, cantidad, precio_unitario, nombre_producto)
             VALUES ($1, $2, $3, $4, $5)`,
            [
              order.id,
              item.productId,
              item.cantidad,
              item.precio_unitario,
              item.nombre_producto,
            ],
          );
        }

        await client.query(
          `INSERT INTO pedido_historial_estados
             (pedido_id, estado_anterior, estado_nuevo, origen)
           VALUES ($1, NULL, 'pendiente', 'PlaceOrder')`,
          [order.id],
        );

        await client.query('COMMIT');
        return order;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    },
  };
}

module.exports = { createOrderRepository };
