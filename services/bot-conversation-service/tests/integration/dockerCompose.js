const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const WINDOWS_DOCKER_DIR =
  'C:\\Program Files\\Docker\\Docker\\resources\\bin';
const WINDOWS_DOCKER = path.join(WINDOWS_DOCKER_DIR, 'docker.exe');

function resolveDockerCommand() {
  if (process.env.DOCKER_BIN) {
    return `"${process.env.DOCKER_BIN}"`;
  }

  if (process.platform === 'win32' && fs.existsSync(WINDOWS_DOCKER)) {
    return `"${WINDOWS_DOCKER}"`;
  }

  return 'docker';
}

function dockerEnv() {
  if (process.platform !== 'win32' || !fs.existsSync(WINDOWS_DOCKER_DIR)) {
    return process.env;
  }

  return {
    ...process.env,
    PATH: `${WINDOWS_DOCKER_DIR};${process.env.PATH || ''}`,
  };
}

function runDockerCompose(args, cwd) {
  const docker = resolveDockerCommand();
  execSync(`${docker} compose ${args}`, {
    cwd,
    stdio: 'inherit',
    env: dockerEnv(),
  });
}

module.exports = { runDockerCompose, dockerEnv, resolveDockerCommand };
