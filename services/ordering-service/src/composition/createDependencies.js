const { createPool } = require('../modules/ordering/infrastructure/postgres/pool');
const { createClientRepository } = require('../modules/ordering/infrastructure/postgres/clientRepository');
const { createProductRepository } = require('../modules/ordering/infrastructure/postgres/productRepository');
const { createRedisClient } = require('../modules/ordering/infrastructure/redis/client');
const { createStreamPublisher } = require('../modules/ordering/infrastructure/redis/streamPublisher');
const { createDlqPublisher } = require('../modules/ordering/infrastructure/redis/dlqPublisher');
const { createGetClientByPhone } = require('../modules/ordering/application/getClientByPhone');
const { createRegisterClient } = require('../modules/ordering/application/registerClient');
const { createGetProductCatalog } = require('../modules/ordering/application/getProductCatalog');
const { createGetProductById } = require('../modules/ordering/application/getProductById');
const { createStreamCommandDispatcher } = require('../modules/ordering/application/streamCommandDispatcher');
const { createOrderingStreamConsumer } = require('../modules/ordering/infrastructure/redis/orderingStreamConsumer');
const { createJwtVerifier } = require('../modules/ordering/infrastructure/http/jwtVerifier');
const { createJwtAuthMiddleware } = require('../modules/ordering/infrastructure/http/jwtAuthMiddleware');

function createDependencies(config = {}) {
  const databaseUrl = config.databaseUrl || process.env.DATABASE_URL;
  const redisUrl = config.redisUrl || process.env.REDIS_URL;
  const jwtPublicKey = config.jwtPublicKey || process.env.JWT_PUBLIC_KEY;

  const pool = createPool(databaseUrl);
  const clientRepository = createClientRepository(pool);
  const productRepository = createProductRepository(pool);
  const redis = createRedisClient(redisUrl);
  const eventPublisher = createStreamPublisher({ redis });
  const { publishToDlq } = createDlqPublisher({ redis });
  const getClientByPhone = createGetClientByPhone({ clientRepository });
  const registerClient = createRegisterClient({ clientRepository });
  const getProductCatalog = createGetProductCatalog({ productRepository });
  const getProductById = createGetProductById({ productRepository });
  const dispatchStreamCommand = createStreamCommandDispatcher({
    eventPublisher,
    getClientByPhone,
    registerClient,
    getProductCatalog,
    getProductById,
  });
  const streamConsumer = createOrderingStreamConsumer({
    redis,
    dispatchStreamCommand,
    eventPublisher,
    publishToDlq,
  });
  const jwtVerifier = createJwtVerifier({ publicKey: jwtPublicKey });
  const jwtAuthMiddleware = createJwtAuthMiddleware({ jwtVerifier });

  const appDeps = {
    pool,
    redis,
    streamConsumer,
    jwtAuthMiddleware,
  };

  if (config._exposeInternals) {
    return {
      ...appDeps,
      eventPublisher,
      dispatchStreamCommand,
      publishToDlq,
    };
  }

  return appDeps;
}

module.exports = { createDependencies };
