function isDeliveryStatusPayload(body) {
  const value = body?.entry?.[0]?.changes?.[0]?.value;
  return Array.isArray(value?.statuses) && value.statuses.length > 0;
}

module.exports = { isDeliveryStatusPayload };
