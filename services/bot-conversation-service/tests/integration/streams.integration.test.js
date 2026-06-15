const fs = require('fs');
const path = require('path');
const { createClient } = require('redis');
const { createDependencies: createBotDependencies } = require('../../src/composition/createDependencies');
const {
  createDependencies: createOrderingDependencies,
} = require('../../../ordering-service/src/composition/createDependencies');
const {
  STREAM_BOT_EVENTS,
  STREAM_ORDERING_EVENTS,
  CONSUMER_GROUP_ORDERING,
  CONSUMER_GROUP_BOT,
} = require('../../../ordering-service/src/modules/ordering/domain/messaging/streams');

const TEST_ENV_FILE = path.join(__dirname, '.test-env.json');

function getTestRedisUrl() {
  const env = JSON.parse(fs.readFileSync(TEST_ENV_FILE, 'utf8'));
  return env.REDIS_URL;
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

describe('Redis Streams request-reply integration', () => {
  let redisUrl;
  let adminRedis;
  let botDeps;
  let orderingDeps;

  beforeAll(async () => {
    redisUrl = getTestRedisUrl();
    adminRedis = createClient({ url: redisUrl });
    await adminRedis.connect();
    await adminRedis.flushDb();

    botDeps = createBotDependencies({
      redisUrl,
      replyTimeoutMs: 5000,
    });
    orderingDeps = createOrderingDependencies({
      redisUrl,
      databaseUrl: 'postgresql://streams_test:streams_test@localhost:5432/streams_test',
    });

    await botDeps.redis.connect();
    await orderingDeps.redis.connect();

    await botDeps.streamEventConsumer.start();
    await orderingDeps.streamConsumer.start();
    await sleep(300);
  });

  afterAll(async () => {
    await botDeps.streamEventConsumer.shutdown();
    await orderingDeps.streamConsumer.shutdown();
    await botDeps.redis.quit();
    await orderingDeps.redis.quit();
    await adminRedis.quit();
  });

  test('creates streams with operational consumer groups', async () => {
    const botGroups = await adminRedis.xInfoGroups(STREAM_BOT_EVENTS);
    const orderingGroups = await adminRedis.xInfoGroups(STREAM_ORDERING_EVENTS);

    expect(botGroups.map((group) => group.name)).toContain(CONSUMER_GROUP_ORDERING);
    expect(orderingGroups.map((group) => group.name)).toContain(CONSUMER_GROUP_BOT);
  });

  test('round-trips Ping to Pong with required metadata and correlationId', async () => {
    const wamid = 'wamid.integration.ping.001';
    const phone = '51999001001';

    const response = await botDeps.streamCommandClient.sendPing({ wamid, phone });

    expect(response.timedOut).toBeUndefined();
    expect(response.type).toBe('Pong');
    expect(response.wamid).toBe(wamid);
    expect(response.phone).toBe(phone);
    expect(response.correlationId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
    expect(response.timestamp).toBeTruthy();
    expect(response.payload).toBe('{}');
  });

  test('returns waiting message on reply timeout without failing the call', async () => {
    await orderingDeps.streamConsumer.shutdown();

    const response = await botDeps.streamCommandClient.sendPing({
      wamid: 'wamid.integration.timeout.001',
      phone: '51999001002',
    });

    expect(response.timedOut).toBe(true);
    expect(response.waitingMessage).toContain('espera');
    expect(response.correlationId).toBeTruthy();

    await orderingDeps.streamConsumer.start();
    await sleep(300);
  });

  test('XACKs bot command only after successful processing', async () => {
    const wamid = 'wamid.integration.ack.001';
    const phone = '51999001003';

    await botDeps.streamCommandClient.sendPing({ wamid, phone });
    await sleep(500);

    const pending = await adminRedis.xPending(STREAM_BOT_EVENTS, CONSUMER_GROUP_ORDERING);
    expect(Number(pending.pending)).toBe(0);
  });
});
