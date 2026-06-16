const { createGetClientByPhone } = require('./getClientByPhone');
const { createRegisterClient } = require('./registerClient');
const { createHandleStreamCommand } = require('./handleStreamCommand');

module.exports = {
  createGetClientByPhone,
  createRegisterClient,
  createHandleStreamCommand,
};
