export const ADMIN = 'gattim@gmail.com';
export const securityHeaders = {
  'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff',
  'X-Frame-Options':'DENY', 'Referrer-Policy':'no-referrer',
  'Strict-Transport-Security':'max-age=31536000; includeSubDomains',
  'Permissions-Policy':'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'; object-src 'none'"
};
export function validConfig(env) {
 return env.ADMIN_ENABLED === 'true' && env.ADMIN_EMAIL === ADMIN && /^[A-Za-z0-9_-]{43}$/.test(env.ADMIN_AUTH_KEY || '') && !!env.MITCH_DB;
}
export async function verifyAdmin(request,env) {
 const { authenticate }=await import('./auth.mjs');
 return authenticate(request,env);
}
export function sameOriginMutation(request) {
  return request.headers.get('origin') === new URL(request.url).origin &&
    request.headers.get('content-type')?.split(';')[0].trim()==='application/json' &&
    request.headers.get('X-Admin-Action')==='1' &&
    (!request.headers.get('sec-fetch-site') || request.headers.get('sec-fetch-site')==='same-origin');
}
export function json(body,status=200){return Response.json(body,{status,headers:securityHeaders});}
export function secure(response){const headers=new Headers(response.headers);for(const [key,value] of Object.entries(securityHeaders))headers.set(key,value);return new Response(response.body,{status:response.status,headers});}
