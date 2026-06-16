/**
 * Express middleware for protected HTTP routes (not wired in app.js until a consumer exists).
 *
 * Usage when adding routes:
 *   app.get('/api/orders', deps.jwtAuthMiddleware, handler);
 *
 * @param {{ jwtVerifier: { verify: (token: string) => object | null } }} deps
 */
function createJwtAuthMiddleware({ jwtVerifier }) {
  return function jwtAuth(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.sendStatus(401);
      return;
    }

    const token = authHeader.slice('Bearer '.length);
    const payload = jwtVerifier.verify(token);

    if (!payload) {
      res.sendStatus(401);
      return;
    }

    req.user = payload;
    next();
  };
}

module.exports = { createJwtAuthMiddleware };
