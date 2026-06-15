const fs = require('fs');
const path = require('path');
const { runDockerCompose } = require('./dockerCompose');

const SERVICE_ROOT = path.join(__dirname, '..', '..');
const COMPOSE_FILE = path.join(SERVICE_ROOT, 'docker-compose.test.yml');
const TEST_ENV_FILE = path.join(__dirname, '.test-env.json');

module.exports = async () => {
  if (fs.existsSync(TEST_ENV_FILE)) {
    const env = JSON.parse(fs.readFileSync(TEST_ENV_FILE, 'utf8'));

    if (env.mode === 'docker') {
      runDockerCompose(`-f "${COMPOSE_FILE}" down -v`, SERVICE_ROOT);
    }
  }

  if (fs.existsSync(TEST_ENV_FILE)) {
    fs.unlinkSync(TEST_ENV_FILE);
  }
};
