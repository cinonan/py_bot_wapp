const { z } = require('zod');

const dispatchOrderPayloadSchema = z.object({
  orderId: z.number().int().positive(),
});

function parseDispatchOrderPayload(payloadJson) {
  const parsed = typeof payloadJson === 'string' ? JSON.parse(payloadJson) : payloadJson;
  return dispatchOrderPayloadSchema.parse(parsed);
}

module.exports = {
  dispatchOrderPayloadSchema,
  parseDispatchOrderPayload,
};
