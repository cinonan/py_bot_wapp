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

const getProductCatalogCommandSchema = streamEnvelopeSchema.extend({
  type: z.literal('GetProductCatalog'),
});

const getProductByIdCommandSchema = streamEnvelopeSchema.extend({
  type: z.literal('GetProductById'),
});

const addToCartCommandSchema = streamEnvelopeSchema.extend({
  type: z.literal('AddToCart'),
});

const getCartCommandSchema = streamEnvelopeSchema.extend({
  type: z.literal('GetCart'),
});

const clearCartCommandSchema = streamEnvelopeSchema.extend({
  type: z.literal('ClearCart'),
});

const updateClientDniCommandSchema = streamEnvelopeSchema.extend({
  type: z.literal('UpdateClientDni'),
});

const placeOrderCommandSchema = streamEnvelopeSchema.extend({
  type: z.literal('PlaceOrder'),
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

const catalogLoadedEventSchema = streamEnvelopeSchema.extend({
  type: z.literal('CatalogLoaded'),
});

const productResolvedEventSchema = streamEnvelopeSchema.extend({
  type: z.literal('ProductResolved'),
});

const productNotFoundEventSchema = streamEnvelopeSchema.extend({
  type: z.literal('ProductNotFound'),
});

const catalogLoadFailedEventSchema = streamEnvelopeSchema.extend({
  type: z.literal('CatalogLoadFailed'),
});

const cartUpdatedEventSchema = streamEnvelopeSchema.extend({
  type: z.literal('CartUpdated'),
});

const addToCartFailedEventSchema = streamEnvelopeSchema.extend({
  type: z.literal('AddToCartFailed'),
});

const orderPlaceFailedEventSchema = streamEnvelopeSchema.extend({
  type: z.literal('OrderPlaceFailed'),
});

const orderPlacedEventSchema = streamEnvelopeSchema.extend({
  type: z.literal('OrderPlaced'),
});

const clientDniUpdatedEventSchema = streamEnvelopeSchema.extend({
  type: z.literal('ClientDniUpdated'),
});

const updateClientDniFailedEventSchema = streamEnvelopeSchema.extend({
  type: z.literal('UpdateClientDniFailed'),
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
  getProductCatalogCommandSchema,
  getProductByIdCommandSchema,
  addToCartCommandSchema,
  getCartCommandSchema,
  clearCartCommandSchema,
  updateClientDniCommandSchema,
  placeOrderCommandSchema,
  pongEventSchema,
  clientFoundEventSchema,
  clientNotFoundEventSchema,
  clientRegisteredEventSchema,
  registerClientFailedEventSchema,
  catalogLoadedEventSchema,
  productResolvedEventSchema,
  productNotFoundEventSchema,
  catalogLoadFailedEventSchema,
  cartUpdatedEventSchema,
  addToCartFailedEventSchema,
  orderPlaceFailedEventSchema,
  orderPlacedEventSchema,
  clientDniUpdatedEventSchema,
  updateClientDniFailedEventSchema,
  orderDispatchFailedEventSchema,
  parseStreamFields,
  parseStreamEnvelope,
};
