const { z } = require('zod');

const productRecordSchema = z.object({
  id: z.number().int().positive(),
  nombre: z.string().min(1),
  precio: z.union([z.string(), z.number()]),
});

const catalogLoadedPayloadSchema = z.object({
  products: z.array(productRecordSchema),
});

const productResolvedPayloadSchema = z.object({
  product: productRecordSchema,
});

function parseCatalogLoadedPayload(payloadJson) {
  const parsed = typeof payloadJson === 'string' ? JSON.parse(payloadJson) : payloadJson;
  return catalogLoadedPayloadSchema.parse(parsed);
}

function parseProductResolvedPayload(payloadJson) {
  const parsed = typeof payloadJson === 'string' ? JSON.parse(payloadJson) : payloadJson;
  return productResolvedPayloadSchema.parse(parsed);
}

module.exports = {
  productRecordSchema,
  catalogLoadedPayloadSchema,
  productResolvedPayloadSchema,
  parseCatalogLoadedPayload,
  parseProductResolvedPayload,
};
