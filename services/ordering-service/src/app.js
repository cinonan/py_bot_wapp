const express = require('express');
const { checkPostgresHealth } = require('./modules/ordering/infrastructure/postgres/healthCheck');

function createApp(deps) {
  const app = express();

  app.get('/health', async (_req, res) => {
    try {
      const postgres = await checkPostgresHealth(deps.pool);
      res.status(200).json({ status: 'ok', ...postgres });
    } catch (_error) {
      res.status(503).json({ status: 'error', postgres: 'disconnected' });
    }
  });

  return app;
}

function startServer() {
  const { createDependencies } = require('./composition/createDependencies');
  const deps = createDependencies();
  const app = createApp(deps);
  const port = Number(process.env.PORT) || 3001;

  app.listen(port, () => {
    console.log(`Ordering service listening on port ${port}`);
  });

  return app;
}

if (require.main === module) {
  require('dotenv').config();
  startServer();
}

module.exports = { createApp, startServer };
