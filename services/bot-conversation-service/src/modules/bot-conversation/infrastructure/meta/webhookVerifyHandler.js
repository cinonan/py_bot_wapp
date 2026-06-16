/**
 * @param {{ verifyToken: string }} deps
 */
function createWebhookVerifyHandler({ verifyToken }) {
  return function handleWebhookVerify(req, res) {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === verifyToken) {
      res.status(200).type('text/plain').send(String(challenge ?? ''));
      return;
    }

    res.sendStatus(403);
  };
}

module.exports = { createWebhookVerifyHandler };
