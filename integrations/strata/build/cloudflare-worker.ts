import { recordAnonymous } from './anonymous-analytics';
import handler from 'vinext/server/fetch-handler';

export default {
  async fetch(request: Request, env: Cloudflare.Env, ctx: ExecutionContext) {
    // Browsing and planning are public. Persistent APIs enforce account ownership.
    const response = await handler.fetch(request, env, ctx);
    ctx.waitUntil(recordAnonymous(request,response,env.DB));
    const headers = new Headers(response.headers);
    headers.set('X-Content-Type-Options', 'nosniff');
    headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    if (new URL(request.url).pathname.startsWith('/api/auth/')) headers.set('Cache-Control', 'no-store');
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  }
};
