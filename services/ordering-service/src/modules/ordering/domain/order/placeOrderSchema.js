const { z } = require('zod');
const { dniSchema } = require('../client/updateClientDniSchema');

const placeOrderPayloadSchema = z.object({
  direccion_entrega: z
    .string()
    .trim()
    .min(5, 'direccion_entrega must be at least 5 characters'),
  dni_facturacion: dniSchema.optional(),
});

function parsePlaceOrderPayload(payloadJson) {
  const parsed = typeof payloadJson === 'string' ? JSON.parse(payloadJson) : payloadJson;
  return placeOrderPayloadSchema.parse(parsed);
}

module.exports = {
  placeOrderPayloadSchema,
  parsePlaceOrderPayload,
};
