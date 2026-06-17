const { z } = require('zod');
const { cartItemSchema } = require('./cartEventSchemas');

const orderPlacedPayloadSchema = z.object({
  order: z.object({
    id: z.number().int().positive(),
    total: z.union([z.string(), z.number()]),
    estado: z.string().min(1),
    direccion_entrega: z.string().min(1),
    dni_facturacion: z.string().nullable().optional(),
    items: z.array(cartItemSchema),
  }),
  client: z.object({
    id: z.number().int().positive(),
    nombre: z.string().min(1),
    telefono: z.string().min(1),
  }),
});

function parseOrderPlacedPayload(payloadJson) {
  const parsed = typeof payloadJson === 'string' ? JSON.parse(payloadJson) : payloadJson;
  return orderPlacedPayloadSchema.parse(parsed);
}

const orderDispatchedPayloadSchema = z.object({
  order: z.object({
    id: z.number().int().positive(),
    total: z.union([z.string(), z.number()]),
    estado: z.string().min(1),
    direccion_entrega: z.string().nullable().optional(),
    fecha_atencion: z.union([z.string(), z.date()]).optional(),
  }),
  client: z.object({
    id: z.number().int().positive(),
    nombre: z.string().min(1),
    telefono: z.string().min(1),
  }),
});

function parseOrderDispatchedPayload(payloadJson) {
  const parsed = typeof payloadJson === 'string' ? JSON.parse(payloadJson) : payloadJson;
  return orderDispatchedPayloadSchema.parse(parsed);
}

module.exports = {
  orderPlacedPayloadSchema,
  parseOrderPlacedPayload,
  orderDispatchedPayloadSchema,
  parseOrderDispatchedPayload,
};
