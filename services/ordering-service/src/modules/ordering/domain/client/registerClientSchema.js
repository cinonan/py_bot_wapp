const { z } = require('zod');

const registerClientPayloadSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(1, 'nombre is required')
    .max(100, 'nombre must be at most 100 characters'),
  direccion_principal: z
    .string()
    .trim()
    .min(5, 'direccion_principal must be at least 5 characters'),
});

const clientRecordSchema = z.object({
  id: z.number().int().positive(),
  telefono: z.string().min(1),
  nombre: z.string().min(1),
  direccion_principal: z.string().min(1),
  dni: z.string().nullable().optional(),
});

function parseRegisterClientPayload(payloadJson) {
  const parsed = typeof payloadJson === 'string' ? JSON.parse(payloadJson) : payloadJson;
  return registerClientPayloadSchema.parse(parsed);
}

module.exports = {
  registerClientPayloadSchema,
  clientRecordSchema,
  parseRegisterClientPayload,
};
