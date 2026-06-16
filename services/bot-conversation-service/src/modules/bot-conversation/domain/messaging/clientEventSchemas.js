const { z } = require('zod');

const clientRecordSchema = z.object({
  id: z.number().int().positive(),
  telefono: z.string().min(1),
  nombre: z.string().min(1),
  direccion_principal: z.string().min(1),
  dni: z.string().nullable().optional(),
});

const clientFoundPayloadSchema = z.object({
  client: clientRecordSchema,
});

const clientRegisteredPayloadSchema = z.object({
  client: clientRecordSchema,
});

function parseClientFoundPayload(payloadJson) {
  const parsed = typeof payloadJson === 'string' ? JSON.parse(payloadJson) : payloadJson;
  return clientFoundPayloadSchema.parse(parsed);
}

function parseClientRegisteredPayload(payloadJson) {
  const parsed = typeof payloadJson === 'string' ? JSON.parse(payloadJson) : payloadJson;
  return clientRegisteredPayloadSchema.parse(parsed);
}

module.exports = {
  clientRecordSchema,
  clientFoundPayloadSchema,
  clientRegisteredPayloadSchema,
  parseClientFoundPayload,
  parseClientRegisteredPayload,
};
