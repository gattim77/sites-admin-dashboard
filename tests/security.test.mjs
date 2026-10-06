import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPair, SignJWT } from 'jose';
import { verifyAdmin, sameOriginMutation, validConfig } from '../src/security.mjs';
import { handle, dateRange } from '../src/worker.mjs';
const env={ADMIN_ENABLED:'true',ADMIN_EMAIL:'gattim@gmail.com',ACCESS_ISSUER:'https://third-ai.cloudflareaccess.com',ACCESS_AUD:'a'.repeat(64)};
const {privateKey,publicKey}=await generateKeyPair('RS256');
async function token(overrides={}){return new SignJWT({email:'gattim@gmail.com',...overrides}).setProtectedHeader({alg:'RS256'}).setIssuer(env.ACCESS_ISSUER).setAudience(env.ACCESS_AUD).setSubject('owner').setIssuedAt().setExpirationTime('5m').sign(privateKey);}
function request(t){return new Request('https://admin.third-ai.com/api/users',{headers:t?{'Cf-Access-Jwt-Assertion':t}:{}});}
test('valid signed owner identity succeeds',async()=>assert.equal((await verifyAdmin(request(await token()),env,publicKey)).email,env.ADMIN_EMAIL));
test('forged identity header alone fails',async()=>await assert.rejects(verifyAdmin(new Request('https://admin.third-ai.com/',{headers:{'Cf-Access-Authenticated-User-Email':env.ADMIN_EMAIL}}),env,publicKey)));
test('another signed email fails',async()=>await assert.rejects(verifyAdmin(request(await token({email:'other@example.com'})),env,publicKey)));
test('mixed-case administrator email does not bypass exact match',async()=>await assert.rejects(verifyAdmin(request(await token({email:'GATTIM@gmail.com'})),env,publicKey)));
test('wrong audience fails',async()=>{const t=await new SignJWT({email:env.ADMIN_EMAIL}).setProtectedHeader({alg:'RS256'}).setIssuer(env.ACCESS_ISSUER).setAudience('other').setSubject('owner').setIssuedAt().setExpirationTime('5m').sign(privateKey);await assert.rejects(verifyAdmin(request(t),env,publicKey));});
test('expired token fails',async()=>{const t=await new SignJWT({email:env.ADMIN_EMAIL}).setProtectedHeader({alg:'RS256'}).setIssuer(env.ACCESS_ISSUER).setAudience(env.ACCESS_AUD).setSubject('owner').setIssuedAt(10).setExpirationTime(20).sign(privateKey);await assert.rejects(verifyAdmin(request(t),env,publicKey));});
test('invalid signature fails',async()=>{const {publicKey:other}=await generateKeyPair('RS256');await assert.rejects(verifyAdmin(request(await token()),env,other));});
test('locked deployment does not fetch protected assets',async()=>{let touched=false;const response=await handle(request(),{...env,ADMIN_ENABLED:'false',ASSETS:{fetch(){touched=true;}}});assert.equal(response.status,503);assert.equal(touched,false);assert.equal(validConfig({}),false);});
test('unauthenticated API and HTML denied',async()=>{for(const path of ['/','/app.js','/api/users','/api/overview','/api/audit','/api/system']){const r=await handle(new Request('https://admin.third-ai.com'+path),env);assert.equal(r.status,403);assert.equal(r.headers.get('cache-control'),'no-store');assert.equal(r.headers.get('x-frame-options'),'DENY');}});
test('alternative Workers host denied',async()=>assert.equal((await handle(new Request('https://sites-admin-dashboard.gattim.workers.dev'),env)).status,421));
test('CSRF requires same origin and explicit JSON custom header',()=>{const good={'Origin':'https://admin.third-ai.com','Content-Type':'application/json','X-Admin-Action':'1'};assert.equal(sameOriginMutation(new Request('https://admin.third-ai.com/api/users',{method:'POST',headers:good})),true);for(const headers of [{...good,Origin:'https://evil.example'},{...good,'X-Admin-Action':'0'},{...good,'Content-Type':'text/plain'},{...good,'Sec-Fetch-Site':'cross-site'}])assert.equal(sameOriginMutation(new Request('https://admin.third-ai.com/api/users',{method:'POST',headers})),false);});
test('invalid custom dates rejected',()=>{assert.throws(()=>dateRange(new URL('https://admin.third-ai.com/?start=invalid')));assert.throws(()=>dateRange(new URL('https://admin.third-ai.com/?start=2020-01-01&end=2026-10-06')));});
