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

const getClientByPhoneCommandSchema = streamEnvelopeSchema.extend({
  type: z.literal('GetClientByPhone'),
});

const registerClientCommandSchema = streamEnvelopeSchema.extend({
  type: z.literal('RegisterClient'),
});

const pongEventSchema = streamEnvelopeSchema.extend({
  type: z.literal('Pong'),
});

const clientFoundEventSchema = streamEnvelopeSchema.extend({
  type: z.literal('ClientFound'),
});

const clientNotFoundEventSchema = streamEnvelopeSchema.extend({
  type: z.literal('ClientNotFound'),
});

const clientRegisteredEventSchema = streamEnvelopeSchema.extend({
  type: z.literal('ClientRegistered'),
});

const registerClientFailedEventSchema = streamEnvelopeSchema.extend({
  type: z.literal('RegisterClientFailed'),
});

const catalogLoadFailedEventSchema = streamEnvelopeSchema.extend({
  type: z.literal('CatalogLoadFailed'),
});

const orderPlaceFailedEventSchema = streamEnvelopeSchema.extend({
  type: z.literal('OrderPlaceFailed'),
});

const orderDispatchFailedEventSchema = streamEnvelopeSchema.extend({
  type: z.literal('OrderDispatchFailed'),
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
  getClientByPhoneCommandSchema,
  registerClientCommandSchema,
  pongEventSchema,
  clientFoundEventSchema,
  clientNotFoundEventSchema,
  clientRegisteredEventSchema,
  registerClientFailedEventSchema,
  catalogLoadFailedEventSchema,
  orderPlaceFailedEventSchema,
  orderDispatchFailedEventSchema,
  parseStreamFields,
  parseStreamEnvelope,
};
