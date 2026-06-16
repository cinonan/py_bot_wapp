const { DuplicateClientError } = require('./client/duplicateClientError');
const { parseRegisterClientPayload } = require('./client/registerClientSchema');

module.exports = {
  DuplicateClientError,
  parseRegisterClientPayload,
};
