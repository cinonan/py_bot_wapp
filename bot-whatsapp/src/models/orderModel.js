const { pool } = require('../config/db');

/**
 * Inserta cabecera en pedidos y detalles en detalle_pedidos dentro de una transacción.
 * @param {{ cliente: string, total: number, estado?: string, direccion_entrega?: string|null }} orderData
 * @param {Array<{ id: number, cantidad: number, precio: number }>} items - Precios snapshot del carrito (Redis).
 * @returns {Promise<{ id: number }>}
 */
async function createOrderWithDetails(orderData, items) {
  if (!orderData?.cliente) {
    throw new Error('orderData.cliente es obligatorio.');
  }

  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('El pedido debe incluir al menos un ítem.');
  }

  const computedTotal = items.reduce((acc, it) => {
    const qty = Number(it.cantidad);
    const price = Number(it.precio);
    if (!Number.isInteger(qty) || qty <= 0) {
      throw new Error('Cantidad inválida en un ítem del pedido.');
    }
    if (Number.isNaN(price) || price < 0) {
      throw new Error('Precio inválido en un ítem del pedido.');
    }
    return acc + qty * price;
  }, 0);

  const total =
    orderData.total != null && !Number.isNaN(Number(orderData.total))
      ? Number(orderData.total)
      : computedTotal;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const orderInsert = await client.query(
      `INSERT INTO pedidos (cliente, total, estado, direccion_entrega)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [
        orderData.cliente,
        total,
        orderData.estado || 'pendiente',
        orderData.direccion_entrega ?? null,
      ]
    );

    const orderId = orderInsert.rows[0].id;

    for (const item of items) {
      const qty = Number(item.cantidad);
      const price = Number(item.precio);
      const productId = Number(item.id);

      await client.query(
        `INSERT INTO detalle_pedidos (id_pedido, id_producto, cantidad, precio_unitario)
         VALUES ($1, $2, $3, $4)`,
        [orderId, productId, qty, price]
      );
    }

    await client.query('COMMIT');
    return { id: orderId };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Actualiza el estado del pedido y registra fecha de atención.
 * @param {number} orderId
 * @param {string} status - p. ej. 'entregado'
 * @returns {Promise<{ rowCount: number }>}
 */
async function updateOrderStatus(orderId, status) {
  const id = Number(orderId);
  const estado = String(status ?? '').trim();
  if (!Number.isInteger(id) || id <= 0 || !estado) {
    throw new Error('updateOrderStatus: orderId y status son obligatorios.');
  }

  const result = await pool.query(
    `UPDATE pedidos
     SET estado = $2, fecha_atencion = CURRENT_TIMESTAMP
     WHERE id = $1`,
    [id, estado]
  );

  return { rowCount: result.rowCount };
}

/**
 * Pedido con datos del cliente (teléfono vía JOIN).
 * @param {number} orderId
 * @returns {Promise<object|null>}
 */
async function getOrderWithCustomer(orderId) {
  const id = Number(orderId);
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error('getOrderWithCustomer: orderId inválido.');
  }

  const result = await pool.query(
    `SELECT p.id,
            p.cliente,
            p.total,
            p.estado,
            p.direccion_entrega,
            p.fecha_solicitud,
            p.fecha_atencion,
            c.telefono AS telefono_cliente,
            c.nombre AS nombre_cliente
     FROM pedidos p
     INNER JOIN clientes c ON c.telefono = p.cliente
     WHERE p.id = $1`,
    [id]
  );

  return result.rows[0] ?? null;
}

module.exports = {
  createOrderWithDetails,
  updateOrderStatus,
  getOrderWithCustomer,
};
