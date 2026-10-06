import { createRemoteJWKSet, jwtVerify } from 'jose';
const sets = new Map();
export const ADMIN = 'gattim@gmail.com';
export const securityHeaders = {
  'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff',
  'X-Frame-Options':'DENY', 'Referrer-Policy':'no-referrer',
  'Strict-Transport-Security':'max-age=31536000; includeSubDomains',
  'Permissions-Policy':'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'; object-src 'none'"
};
export function validConfig(env) {
  return env.ADMIN_ENABLED === 'true' && env.ADMIN_EMAIL === ADMIN &&
    /^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com$/.test(env.ACCESS_ISSUER || '') &&
    /^[a-f0-9]{64}$/.test(env.ACCESS_AUD || '');
}
export async function verifyAdmin(request, env, keySet) {
  if(!validConfig(env))throw new Error('Administration is locked');
  const token=request.headers.get('Cf-Access-Jwt-Assertion');
  if(!token || token.length>16384)throw new Error('Authentication required');
  let keys=keySet;
  if(!keys){
    keys=sets.get(env.ACCESS_ISSUER);
    if(!keys){keys=createRemoteJWKSet(new URL(env.ACCESS_ISSUER+'/cdn-cgi/access/certs'));sets.set(env.ACCESS_ISSUER,keys);}
  }
  const {payload}=await jwtVerify(token, keys, {
    issuer:env.ACCESS_ISSUER,audience:env.ACCESS_AUD, algorithms:['RS256'],
    requiredClaims:['exp','iat','sub','email','aud','iss'],clockTolerance:5
  });
  if(payload.email !== ADMIN || typeof payload.sub!=='string' || !payload.sub)throw new Error('Forbidden');
  return {email:ADMIN,sub:payload.sub};
}
export function sameOriginMutation(request) {
  return request.headers.get('origin') === new URL(request.url).origin &&
    request.headers.get('content-type')?.split(';')[0].trim()==='application/json' &&
    request.headers.get('X-Admin-Action')==='1' &&
    (!request.headers.get('sec-fetch-site') || request.headers.get('sec-fetch-site')==='same-origin');
}
export function json(body,status=200){return Response.json(body,{status,headers:securityHeaders});}
export function secure(response){const headers=new Headers(response.headers);for(const [key,value] of Object.entries(securityHeaders))headers.set(key,value);return new Response(response.body,{status:response.status,headers});}
