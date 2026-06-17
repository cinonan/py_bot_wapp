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
const { createUpdateClientDni } = require('../modules/ordering/application/updateClientDni');
const { createPlaceOrder } = require('../modules/ordering/application/placeOrder');
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
  const redis = createRedisClient(redisUrl);
  const eventPublisher = createStreamPublisher({ redis });
  const { publishToDlq } = createDlqPublisher({ redis });
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
  const dispatchStreamCommand = createStreamCommandDispatcher({
    eventPublisher,
    getClientByPhone,
    registerClient,
    getProductCatalog,
    getProductById,
    addToCart,
    getCart,
    clearCart,
    updateClientDni,
    placeOrder,
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
      cartStore,
    };
  }

  return appDeps;
}

module.exports = { createDependencies };
