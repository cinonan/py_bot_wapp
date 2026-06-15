const express = require('express');
const { checkRedisHealth } = require('./modules/bot-conversation/infrastructure/redis/healthCheck');

function createApp(deps) {
  const app = express();

  app.get('/health', async (_req, res) => {
    try {
      const redis = await checkRedisHealth(deps.redis);
      res.status(200).json({ status: 'ok', ...redis });
    } catch (_error) {
      res.status(503).json({ status: 'error', redis: 'disconnected' });
    }
  });

  return app;
}

async function startServer() {
  const { createDependencies } = require('./composition/createDependencies');
  const deps = createDependencies();
  const app = createApp(deps);
  const port = Number(process.env.PORT) || 3000;

  if (!deps.redis.isOpen) {
    await deps.redis.connect();
  }

  await deps.streamEventConsumer.start();

  const server = app.listen(port, () => {
    console.log(`Bot conversation service listening on port ${port}`);
  });

  async function shutdown(signal) {
    console.log(`Bot conversation service received ${signal}, shutting down stream consumer`);
    await deps.streamEventConsumer.shutdown();
    server.close();
    await deps.redis.quit();
    process.exit(0);
  }

  process.on('SIGTERM', () => {
    shutdown('SIGTERM').catch((error) => {
      console.error('Shutdown error:', error.message);
      process.exit(1);
    });
  });

  process.on('SIGINT', () => {
    shutdown('SIGINT').catch((error) => {
      console.error('Shutdown error:', error.message);
      process.exit(1);
    });
  });

  return app;
}

if (require.main === module) {
  require('dotenv').config();
  startServer().catch((error) => {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  });
}

module.exports = { createApp, startServer };
