const { createPool } = require('../modules/ordering/infrastructure/postgres/pool');
const { createClientRepository } = require('../modules/ordering/infrastructure/postgres/clientRepository');
const { createRedisClient } = require('../modules/ordering/infrastructure/redis/client');
const { createStreamPublisher } = require('../modules/ordering/infrastructure/redis/streamPublisher');
const { createGetClientByPhone } = require('../modules/ordering/application/getClientByPhone');
const { createRegisterClient } = require('../modules/ordering/application/registerClient');
const { createHandleStreamCommand } = require('../modules/ordering/application/handleStreamCommand');
const { createOrderingStreamConsumer } = require('../modules/ordering/infrastructure/redis/orderingStreamConsumer');

function createDependencies(config = {}) {
  const databaseUrl = config.databaseUrl || process.env.DATABASE_URL;
  const redisUrl = config.redisUrl || process.env.REDIS_URL;

  const pool = createPool(databaseUrl);
  const clientRepository = createClientRepository(pool);
  const redis = createRedisClient(redisUrl);
  const eventPublisher = createStreamPublisher({ redis });
  const getClientByPhone = createGetClientByPhone({ clientRepository });
  const registerClient = createRegisterClient({ clientRepository });
  const handleStreamCommand = createHandleStreamCommand({
    eventPublisher,
    getClientByPhone,
    registerClient,
  });
  const streamConsumer = createOrderingStreamConsumer({ redis, handleStreamCommand });

  return {
    pool,
    redis,
    streamConsumer,
  };
}

module.exports = { createDependencies };
