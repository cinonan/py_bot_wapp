const fs = require('fs');
const path = require('path');
const { runDockerCompose } = require('./dockerCompose');

const SERVICE_ROOT = path.join(__dirname, '..', '..');
const COMPOSE_FILE = path.join(SERVICE_ROOT, 'docker-compose.test.yml');
const TEST_ENV_FILE = path.join(__dirname, '.test-env.json');
const DOCKER_REDIS_URL = 'redis://localhost:6380';

module.exports = async () => {
  const externalRedisUrl = process.env.INTEGRATION_REDIS_URL;

  if (externalRedisUrl) {
    fs.writeFileSync(
      TEST_ENV_FILE,
      JSON.stringify({
        REDIS_URL: externalRedisUrl,
        mode: 'external',
      }),
    );
    return;
  }

  runDockerCompose(`-f "${COMPOSE_FILE}" up -d --wait`, SERVICE_ROOT);

  fs.writeFileSync(
    TEST_ENV_FILE,
    JSON.stringify({
      REDIS_URL: DOCKER_REDIS_URL,
      mode: 'docker',
    }),
  );
};
