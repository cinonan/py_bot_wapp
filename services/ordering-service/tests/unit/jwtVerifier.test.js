const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { createJwtVerifier } = require('../../src/modules/ordering/infrastructure/http/jwtVerifier');

describe('jwt verifier', () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });

  const verifier = createJwtVerifier({ publicKey });

  test('accepts a valid RS256 token', () => {
    const token = jwt.sign({ sub: 'panel-user-1' }, privateKey, {
      algorithm: 'RS256',
      expiresIn: '1h',
    });

    expect(verifier.verify(token)).toEqual(
      expect.objectContaining({ sub: 'panel-user-1' }),
    );
  });

  test('rejects an invalid token', () => {
    expect(verifier.verify('not-a-jwt')).toBeNull();
  });

  test('rejects an expired token', () => {
    const token = jwt.sign({ sub: 'panel-user-1' }, privateKey, {
      algorithm: 'RS256',
      expiresIn: '-1s',
    });

    expect(verifier.verify(token)).toBeNull();
  });

  test('rejects a token signed with a different key', () => {
    const { privateKey: otherPrivateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    const token = jwt.sign({ sub: 'panel-user-1' }, otherPrivateKey, {
      algorithm: 'RS256',
      expiresIn: '1h',
    });

    expect(verifier.verify(token)).toBeNull();
  });

  test('reads PEM public keys with escaped newlines from env-style strings', () => {
    const escapedPublicKey = publicKey.replace(/\n/g, '\\n');
    const envVerifier = createJwtVerifier({ publicKey: escapedPublicKey });
    const token = jwt.sign({ sub: 'panel-user-1' }, privateKey, {
      algorithm: 'RS256',
      expiresIn: '1h',
    });

    expect(envVerifier.verify(token)).toEqual(
      expect.objectContaining({ sub: 'panel-user-1' }),
    );
  });
});
