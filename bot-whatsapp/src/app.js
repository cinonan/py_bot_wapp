const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const express = require('express');
const bodyParser = require('body-parser');

const webhookController = require('./controllers/webhookController');

const app = express();
const PORT = process.env.PORT || 3000;
const VERIFY_TOKEN = process.env.WA_VERIFY_TOKEN;

app.use((req, _res, next) => {
  console.log(`[HTTP] ${req.method} ${req.originalUrl}`);
  next();
});

app.use(bodyParser.json());

app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    res.status(200).type('text/plain').send(String(challenge ?? ''));
    return;
  }

  res.sendStatus(403);
});

app.post('/webhook', webhookController.handleWebhook);

app.listen(PORT, () => {
  console.log(`Escuchando en http://localhost:${PORT}`);
});
