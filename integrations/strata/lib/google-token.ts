import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { JWTVerifyGetKey } from 'jose';

const googleKeys = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));

export async function verifyGoogleToken(token: string, clientId: string, nonce: string, keys: JWTVerifyGetKey = googleKeys) {
  const { payload } = await jwtVerify(token, keys, {
    issuer: ['https://accounts.google.com', 'accounts.google.com'],
    audience: clientId,
    algorithms: ['RS256'],
    requiredClaims: ['exp', 'iat', 'sub', 'nonce', 'email', 'email_verified'],
    maxTokenAge: '10 minutes',
    clockTolerance: 30,
  });
  if (payload.nonce !== nonce || payload.email_verified !== true ||
      typeof payload.sub !== 'string' || !payload.sub || payload.sub.length > 255 ||
      typeof payload.email !== 'string' ||
      (payload.azp !== undefined && payload.azp !== clientId) ||
      (Array.isArray(payload.aud) && payload.aud.length > 1 && payload.azp !== clientId)) {
    throw new Error('Invalid Google identity.');
  }
  return { sub: payload.sub, email: payload.email, name: payload.name };
}
