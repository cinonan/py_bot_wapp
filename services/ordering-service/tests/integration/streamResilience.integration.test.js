const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
const { createClient } = require('redis');
const { createTestDependencies } = require('../../src/composition/createTestDependencies');
const { createOrderingStreamConsumer } = require('../../src/modules/ordering/infrastructure/redis/orderingStreamConsumer');
const { createDlqPublisher } = require('../../src/modules/ordering/infrastructure/redis/dlqPublisher');
const { TransientStreamError } = require('../../src/modules/ordering/domain/messaging/streamErrorClassification');
const {
  STREAM_BOT_EVENTS,
  STREAM_ORDERING_DLQ,
  CONSUMER_GROUP_ORDERING,
} = require('../../src/modules/ordering/domain/messaging/streams');

const TEST_ENV_FILE = path.join(__dirname, '.test-env.json');

function getTestEnv() {
  return JSON.parse(fs.readFileSync(TEST_ENV_FILE, 'utf8'));
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function waitFor(condition, { timeoutMs = 10000, intervalMs = 200 } = {}) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (await condition()) {
      return;
    }

    await sleep(intervalMs);
  }

  throw new Error('Condition not met before timeout');
}

describe('ordering-service stream resilience integration', () => {
  let redisUrl;
  let databaseUrl;
  let adminRedis;
  let botDeps;
  let deps;

  beforeAll(async () => {
    const env = getTestEnv();
    databaseUrl = env.DATABASE_URL;
    redisUrl = env.REDIS_URL;

    adminRedis = createClient({ url: redisUrl });
    await adminRedis.connect();
    await adminRedis.flushDb();

    deps = createTestDependencies({ databaseUrl, redisUrl });
    const {
      createTestDependencies: createBotDependencies,
    } = require('../../../bot-conversation-service/src/composition/createTestDependencies');
    botDeps = createBotDependencies({ redisUrl, replyTimeoutMs: 5000 });

    await deps.redis.connect();
    await botDeps.redis.connect();
    await botDeps.streamEventConsumer.start();
    await deps.streamConsumer.start();
    await sleep(300);
  });

  afterAll(async () => {
    await botDeps.streamEventConsumer.shutdown();
    await deps.streamConsumer.shutdown();
    await botDeps.redis.quit();
    await deps.redis.quit();
    await deps.pool.end();
    await adminRedis.quit();
  });

  test('invalid RegisterClient payload is acked and publishes RegisterClientFailed', async () => {
    const response = await botDeps.streamCommandClient.registerClient({
      wamid: 'wamid.resilience.invalid.001',
      phone: '51999005001',
      payload: {
        nombre: '',
        direccion_principal: 'x',
      },
    });

    expect(response.type).toBe('RegisterClientFailed');
    expect(response.timedOut).toBeUndefined();

    await waitFor(async () => {
      const pending = await adminRedis.xPending(STREAM_BOT_EVENTS, CONSUMER_GROUP_ORDERING);
      return Number(pending.pending) === 0;
    });
  });

  test('transient failures keep message in PEL until processing succeeds', async () => {
    await deps.streamConsumer.shutdown();

    let attempts = 0;
    const dispatchStreamCommand = jest.fn(async () => {
      attempts += 1;

      if (attempts < 2) {
        throw new TransientStreamError('simulated database timeout');
      }
    });

    const resilientConsumer = createOrderingStreamConsumer({
      redis: deps.redis,
      dispatchStreamCommand,
      eventPublisher: deps.eventPublisher,
      publishToDlq: createDlqPublisher({ redis: deps.redis }).publishToDlq,
    });

    await resilientConsumer.start();
    await sleep(200);

    const messageId = await adminRedis.xAdd(STREAM_BOT_EVENTS, '*', {
      type: 'Ping',
      wamid: 'wamid.resilience.transient.001',
      correlationId: randomUUID(),
      phone: '51999005002',
      timestamp: new Date().toISOString(),
      payload: '{}',
    });

    await waitFor(async () => {
      const pending = await adminRedis.xPending(STREAM_BOT_EVENTS, CONSUMER_GROUP_ORDERING);
      return Number(pending.pending) > 0;
    });

    await waitFor(async () => {
      const pending = await adminRedis.xPending(STREAM_BOT_EVENTS, CONSUMER_GROUP_ORDERING);
      return Number(pending.pending) === 0;
    });

    expect(attempts).toBeGreaterThanOrEqual(2);

    await resilientConsumer.shutdown();
    await deps.streamConsumer.start();
    await sleep(200);

    const entries = await adminRedis.xRange(STREAM_BOT_EVENTS, messageId, messageId);
    expect(entries).toHaveLength(1);
  });

  test('exhausted unclassified failures move message to ordering:dlq', async () => {
    await deps.streamConsumer.shutdown();

    const dispatchStreamCommand = jest.fn(async () => {
      throw new Error('simulated unclassified failure');
    });
    const { publishToDlq } = createDlqPublisher({ redis: deps.redis });

    const dlqConsumer = createOrderingStreamConsumer({
      redis: deps.redis,
      dispatchStreamCommand,
      eventPublisher: deps.eventPublisher,
      publishToDlq,
      maxRetries: 3,
    });

    await dlqConsumer.start();
    await sleep(200);

    await adminRedis.xAdd(STREAM_BOT_EVENTS, '*', {
      type: 'Ping',
      wamid: 'wamid.resilience.dlq.001',
      correlationId: randomUUID(),
      phone: '51999005003',
      timestamp: new Date().toISOString(),
      payload: '{}',
    });

    await waitFor(async () => {
      const dlqEntries = await adminRedis.xRange(STREAM_ORDERING_DLQ, '-', '+');
      return dlqEntries.length === 1;
    }, { timeoutMs: 15000 });

    const dlqEntries = await adminRedis.xRange(STREAM_ORDERING_DLQ, '-', '+');
    expect(dlqEntries[0].message.wamid).toBe('wamid.resilience.dlq.001');
    expect(dlqEntries[0].message.errorMessage).toContain('simulated unclassified failure');

    const pending = await adminRedis.xPending(STREAM_BOT_EVENTS, CONSUMER_GROUP_ORDERING);
    expect(Number(pending.pending)).toBe(0);

    await dlqConsumer.shutdown();
    await deps.streamConsumer.start();
    await sleep(200);
  });
});
