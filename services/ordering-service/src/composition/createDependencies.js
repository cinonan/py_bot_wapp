const { createPool } = require('../modules/ordering/infrastructure/postgres/pool');
const { createClientRepository } = require('../modules/ordering/infrastructure/postgres/clientRepository');
const { createProductRepository } = require('../modules/ordering/infrastructure/postgres/productRepository');
const { createRedisClient } = require('../modules/ordering/infrastructure/redis/client');
const { createStreamPublisher } = require('../modules/ordering/infrastructure/redis/streamPublisher');
const { createDlqPublisher } = require('../modules/ordering/infrastructure/redis/dlqPublisher');
const { createGetClientByPhone } = require('../modules/ordering/application/getClientByPhone');
const { createRegisterClient } = require('../modules/ordering/application/registerClient');
const { createGetProductCatalog } = require('../modules/ordering/application/getProductCatalog');
const { createCartStore } = require('../modules/ordering/infrastructure/redis/cartStore');
const { createGetProductById } = require('../modules/ordering/application/getProductById');
const { createAddToCart } = require('../modules/ordering/application/addToCart');
const { createGetCart } = require('../modules/ordering/application/getCart');
const { createClearCart } = require('../modules/ordering/application/clearCart');
const { createOrderRepository } = require('../modules/ordering/infrastructure/postgres/orderRepository');
const { createProcessedCommandRepository } = require('../modules/ordering/infrastructure/postgres/processedCommandRepository');
const { createProcessedCommandCache } = require('../modules/ordering/infrastructure/redis/processedCommandCache');
const { createUpdateClientDni } = require('../modules/ordering/application/updateClientDni');
const { createPlaceOrder } = require('../modules/ordering/application/placeOrder');
const { createDispatchOrder } = require('../modules/ordering/application/dispatchOrder');
const { createCommandIdempotency } = require('../modules/ordering/application/commandIdempotency');
const { createIdempotentDispatchStreamCommand } = require('../modules/ordering/application/idempotentDispatchStreamCommand');
const { createPublishStreamEvent } = require('../modules/ordering/application/publishStreamEvent');
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
  const orderRepository = createOrderRepository(pool);
  const processedCommandRepository = createProcessedCommandRepository(pool);
  const redis = createRedisClient(redisUrl);
  const eventPublisher = createStreamPublisher({ redis });
  const { publishToDlq } = createDlqPublisher({ redis });
  const processedCommandCache = createProcessedCommandCache({ redis });
  const commandIdempotency = createCommandIdempotency({
    processedCommandCache,
    processedCommandRepository,
  });
  const basePublishStreamEvent = createPublishStreamEvent(eventPublisher);
  const publishStreamEvent = commandIdempotency.wrapPublishStreamEvent(basePublishStreamEvent);
  const getClientByPhone = createGetClientByPhone({ clientRepository });
  const registerClient = createRegisterClient({ clientRepository });
  const getProductCatalog = createGetProductCatalog({ productRepository });
  const getProductById = createGetProductById({ productRepository });
  const cartStore = createCartStore({ redis });
  const addToCart = createAddToCart({ cartStore, productRepository });
  const getCart = createGetCart({ cartStore });
  const clearCart = createClearCart({ cartStore });
  const updateClientDni = createUpdateClientDni({ clientRepository });
  const placeOrder = createPlaceOrder({ cartStore, clientRepository, orderRepository });
  const dispatchOrder = createDispatchOrder({ orderRepository });
  const innerDispatchStreamCommand = createStreamCommandDispatcher({
    publishStreamEvent,
    getClientByPhone,
    registerClient,
    getProductCatalog,
    getProductById,
    addToCart,
    getCart,
    clearCart,
    updateClientDni,
    placeOrder,
    dispatchOrder,
  });
  const dispatchStreamCommand = createIdempotentDispatchStreamCommand({
    dispatchStreamCommand: innerDispatchStreamCommand,
    commandIdempotency,
    publishStreamEvent: basePublishStreamEvent,
  });
  const streamConsumer = createOrderingStreamConsumer({
    redis,
    dispatchStreamCommand,
    publishStreamEvent,
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
      cartStore,
    };
  }

  return appDeps;
}

module.exports = { createDependencies };
