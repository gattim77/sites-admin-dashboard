import {allowAuthAttempt} from '@/lib/auth-request';
import { env } from 'cloudflare:workers';
import { database, digest, randomUrlSafe, safeOrigin } from '@/lib/auth-storage';
import { getUser, safeReturnTo } from '@/lib/auth';
import { googleCallback, googleConfigured, googleCookie } from '@/lib/google-auth';

export async function POST(request: Request) {
  if (!safeOrigin(request)) return Response.json({ error: 'Invalid request.' }, { status: 403 });
  if (!await allowAuthAttempt(request, 'google', 20)) return Response.json({error:'Too many attempts. Try again later.'},{status:429});
  if (!googleConfigured()) return Response.json({ error: 'Google sign-in is not configured yet. Please use email.' }, { status: 503 });
  const form = await request.formData();
  const returnTo = safeReturnTo(form.get('returnTo'));
  const user = await getUser();
  const state = randomUrlSafe(), browser = randomUrlSafe(), nonce = randomUrlSafe(), verifier = randomUrlSafe(48);
  const db = database();
  await db.prepare('DELETE FROM app_oauth_states WHERE expires_at <= ?').bind(Date.now()).run();
  await db.prepare(`INSERT INTO app_oauth_states (state_hash, browser_hash, nonce, verifier, return_to, link_user_id, expires_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)`).bind(await digest(state), await digest(browser), nonce, verifier, returnTo, user?.userId ?? null, Date.now() + 600_000).run();
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.search = new URLSearchParams({ client_id: env.GOOGLE_CLIENT_ID!, redirect_uri: googleCallback(new URL(request.url).origin),
    response_type: 'code', scope: 'openid email profile', state, nonce,
    code_challenge: await digest(verifier), code_challenge_method: 'S256', prompt: 'select_account' }).toString();
  return new Response(null, { status: 303, headers: { Location: url.href, 'Set-Cookie': googleCookie(browser), 'Cache-Control': 'no-store' } });
}
