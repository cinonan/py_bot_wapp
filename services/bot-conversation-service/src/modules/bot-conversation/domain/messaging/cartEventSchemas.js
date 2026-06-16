const { z } = require('zod');

const cartItemSchema = z.object({
  productId: z.number().int().positive(),
  cantidad: z.number().int().positive(),
  precio_unitario: z.union([z.string(), z.number()]),
  nombre_producto: z.string().min(1),
});

const cartUpdatedPayloadSchema = z.object({
  items: z.array(cartItemSchema),
  subtotal: z.union([z.string(), z.number()]),
});

function parseCartUpdatedPayload(payloadJson) {
  const parsed = typeof payloadJson === 'string' ? JSON.parse(payloadJson) : payloadJson;
  return cartUpdatedPayloadSchema.parse(parsed);
}

module.exports = {
  cartItemSchema,
  cartUpdatedPayloadSchema,
  parseCartUpdatedPayload,
};
