const { z } = require('zod');

const cartQuantitySchema = z.number().int().positive();

const cartItemSchema = z.object({
  productId: z.number().int().positive(),
  cantidad: cartQuantitySchema,
  precio_unitario: z.string().min(1),
  nombre_producto: z.string().min(1),
});

const addToCartPayloadSchema = z
  .object({
    productId: z.number().int().positive(),
    cantidad: cartQuantitySchema,
  })
  .strict();

function parseAddToCartPayload(payloadJson) {
  const parsed = typeof payloadJson === 'string' ? JSON.parse(payloadJson) : payloadJson;
  return addToCartPayloadSchema.parse(parsed);
}

module.exports = {
  cartQuantitySchema,
  cartItemSchema,
  addToCartPayloadSchema,
  parseAddToCartPayload,
};
