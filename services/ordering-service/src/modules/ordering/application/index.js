const { createGetClientByPhone } = require('./getClientByPhone');
const { createRegisterClient } = require('./registerClient');
const { createStreamCommandDispatcher } = require('./streamCommandDispatcher');
const { createHandlePingCommand } = require('./handlePingCommand');
const { createHandleGetClientByPhoneCommand } = require('./handleGetClientByPhoneCommand');
const { createHandleRegisterClientCommand } = require('./handleRegisterClientCommand');

module.exports = {
  createGetClientByPhone,
  createRegisterClient,
  createStreamCommandDispatcher,
  createHandlePingCommand,
  createHandleGetClientByPhoneCommand,
  createHandleRegisterClientCommand,
};
