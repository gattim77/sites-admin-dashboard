import assert from 'node:assert/strict';
import { generateKeyPair, SignJWT, exportJWK, createLocalJWKSet } from 'jose';
import { verifyGoogleToken } from '../lib/google-token.ts';
const { publicKey, privateKey } = await generateKeyPair('RS256');
const jwk = await exportJWK(publicKey); jwk.kid = 'local-test';
const keys = createLocalJWKSet({keys:[jwk]});
const client='local-client', nonce='local-nonce';
const base={sub:'stable-google-subject',email:'person@example.test',email_verified:true,nonce};
async function token(changes={}, issuer='https://accounts.google.com', audience=client, expiry='5m', signer=privateKey) {
 return new SignJWT({...base,...changes}).setProtectedHeader({alg:'RS256',kid:'local-test'}).setIssuer(issuer).setAudience(audience).setIssuedAt().setExpirationTime(expiry).sign(signer);
}
assert.equal((await verifyGoogleToken(await token(),client,nonce,keys)).sub,base.sub);
for(const value of [await token({nonce:'wrong'}),await token({email_verified:false}),await token({sub:''}),await token({azp:'other-client'}),await token({},'https://attacker.test'),await token({},undefined,'other-client'),await token({},undefined,undefined,'-1h')]) {
 await assert.rejects(()=>verifyGoogleToken(value,client,nonce,keys));
}
const other=await generateKeyPair('RS256');
const forged = await token({},undefined,undefined,undefined,other.privateKey);
await assert.rejects(()=>verifyGoogleToken(forged,client,nonce,keys));
await assert.rejects(()=>verifyGoogleToken('not-a-token',client,nonce,keys));
console.log('PASS: Google signatures, issuer, audience, expiry, nonce, authorized party and verified email');
