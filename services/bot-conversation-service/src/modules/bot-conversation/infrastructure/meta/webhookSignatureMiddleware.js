/**
 * @param {{ signatureValidator: { isValid: (rawBody: Buffer|string, signatureHeader: string|undefined) => boolean } }} deps
 */
function createWebhookSignatureMiddleware({ signatureValidator }) {
  return function validateWebhookSignature(req, res, next) {
    const signature = req.headers['x-hub-signature-256'];
    const rawBody = req.rawBody;

    if (!signature) {
      res.sendStatus(401);
      return;
    }

    if (!rawBody || !signatureValidator.isValid(rawBody, signature)) {
      res.sendStatus(403);
      return;
    }

    next();
  };
}

module.exports = { createWebhookSignatureMiddleware };
