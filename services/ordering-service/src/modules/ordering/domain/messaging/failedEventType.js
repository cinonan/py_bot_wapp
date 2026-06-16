const COMMAND_FAILED_EVENTS = {
  RegisterClient: 'RegisterClientFailed',
  GetProductCatalog: 'CatalogLoadFailed',
  PlaceOrder: 'OrderPlaceFailed',
  DispatchOrder: 'OrderDispatchFailed',
};

function resolveFailedEventType(commandType) {
  if (COMMAND_FAILED_EVENTS[commandType]) {
    return COMMAND_FAILED_EVENTS[commandType];
  }

  return `${commandType}Failed`;
}

module.exports = { COMMAND_FAILED_EVENTS, resolveFailedEventType };
