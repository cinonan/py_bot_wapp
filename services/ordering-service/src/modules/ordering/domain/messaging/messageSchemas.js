const { z } = require('zod');

const messageMetadataSchema = z.object({
  wamid: z.string().min(1),
  correlationId: z.string().min(1),
  phone: z.string().min(1),
  timestamp: z.string().min(1),
});

const streamEnvelopeSchema = messageMetadataSchema.extend({
  type: z.string().min(1),
  payload: z.string().optional().default('{}'),
});

const pingCommandSchema = streamEnvelopeSchema.extend({
  type: z.literal('Ping'),
});

const pongEventSchema = streamEnvelopeSchema.extend({
  type: z.literal('Pong'),
});

function parseStreamFields(fields) {
  const record = {};

  if (Array.isArray(fields)) {
    for (let index = 0; index < fields.length; index += 2) {
      record[fields[index]] = fields[index + 1];
    }
    return record;
  }

  return { ...fields };
}

function parseStreamEnvelope(fields) {
  return streamEnvelopeSchema.parse(parseStreamFields(fields));
}

module.exports = {
  messageMetadataSchema,
  streamEnvelopeSchema,
  pingCommandSchema,
  pongEventSchema,
  parseStreamFields,
  parseStreamEnvelope,
};
