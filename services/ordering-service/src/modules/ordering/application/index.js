const { createGetClientByPhone } = require('./getClientByPhone');
const { createRegisterClient } = require('./registerClient');
const { createHandleStreamCommand } = require('./handleStreamCommand');
const { createOrderingStreamConsumer } = require('./startStreamConsumer');

module.exports = {
  createGetClientByPhone,
  createRegisterClient,
  createHandleStreamCommand,
  createOrderingStreamConsumer,
};
