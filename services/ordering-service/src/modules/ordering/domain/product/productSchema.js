const { z } = require('zod');

const getProductByIdPayloadSchema = z.object({
  productId: z.number().int().positive(),
});

function parseGetProductByIdPayload(payloadJson) {
  const parsed = typeof payloadJson === 'string' ? JSON.parse(payloadJson) : payloadJson;
  return getProductByIdPayloadSchema.parse(parsed);
}

module.exports = {
  getProductByIdPayloadSchema,
  parseGetProductByIdPayload,
};
