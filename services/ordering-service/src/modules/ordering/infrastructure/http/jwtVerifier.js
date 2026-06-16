const jwt = require('jsonwebtoken');

function normalizePem(pem) {
  if (!pem) {
    return undefined;
  }

  return String(pem).replace(/\\n/g, '\n');
}

/**
 * RS256 JWT verification for future HTTP consumers (web panels, etc.).
 *
 * @param {{ publicKey: string | undefined }} deps
 * @returns {{ verify: (token: string) => object | null }}
 */
function createJwtVerifier({ publicKey }) {
  const key = normalizePem(publicKey);

  function verify(token) {
    if (!key || !token) {
      return null;
    }

    try {
      return jwt.verify(token, key, { algorithms: ['RS256'] });
    } catch (_error) {
      return null;
    }
  }

  return { verify };
}

module.exports = { createJwtVerifier };
