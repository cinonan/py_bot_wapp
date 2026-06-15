const { createPool } = require('../modules/ordering/infrastructure/postgres/pool');
const { createRedisClient } = require('../modules/ordering/infrastructure/redis/client');
const { createStreamPublisher } = require('../modules/ordering/infrastructure/redis/streamPublisher');
const { createHandleStreamCommand } = require('../modules/ordering/application/handleStreamCommand');
const { createOrderingStreamConsumer } = require('../modules/ordering/application/startStreamConsumer');

function createDependencies(config = {}) {
  const databaseUrl = config.databaseUrl || process.env.DATABASE_URL;
  const redisUrl = config.redisUrl || process.env.REDIS_URL;

  const pool = createPool(databaseUrl);
  const redis = createRedisClient(redisUrl);
  const eventPublisher = createStreamPublisher({ redis });
  const handleStreamCommand = createHandleStreamCommand({ eventPublisher });
  const streamConsumer = createOrderingStreamConsumer({ redis, handleStreamCommand });

  return {
    pool,
    redis,
    eventPublisher,
    handleStreamCommand,
    streamConsumer,
  };
}

module.exports = { createDependencies };
