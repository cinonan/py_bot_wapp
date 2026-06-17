const { z } = require('zod');

const dniSchema = z
  .string()
  .trim()
  .regex(/^\d{8}$/, 'dni must be exactly 8 digits');

const updateClientDniPayloadSchema = z.object({
  dni: dniSchema,
});

function parseUpdateClientDniPayload(payloadJson) {
  const parsed = typeof payloadJson === 'string' ? JSON.parse(payloadJson) : payloadJson;
  return updateClientDniPayloadSchema.parse(parsed);
}

module.exports = {
  dniSchema,
  updateClientDniPayloadSchema,
  parseUpdateClientDniPayload,
};
