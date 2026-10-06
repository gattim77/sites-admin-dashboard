import { env } from 'cloudflare:workers';
import { database, digest } from '@/lib/auth-storage';
import { createSession, getUser, normalizeEmail, normalizeDisplayName, safeReturnTo, sessionCookie } from '@/lib/auth';
import { googleConfigured, googleCallback, googleCookie, googleBrowserToken } from '@/lib/google-auth';
import type { OAuthState } from '@/lib/google-auth';
import { verifyGoogleToken } from '@/lib/google-token';

export async function GET(request: Request) {
  const url = new URL(request.url);
  let returnTo = '/';
  function failure(error: string) {
    const target = new URL('/login', url.origin);
    target.search = new URLSearchParams({ error, returnTo }).toString();
    return new Response(null, { status: 303, headers: { Location: target.href, 'Set-Cookie': googleCookie('', 0), 'Cache-Control': 'no-store' } });
  }
  if (!googleConfigured()) return failure('google_unavailable');
  const state = url.searchParams.get('state'), browser = googleBrowserToken(request);
  if (!state || !browser || !/^[A-Za-z0-9_-]{40,100}$/.test(state) || !/^[A-Za-z0-9_-]{40,100}$/.test(browser)) return failure('google_state');
  const db = database();
  // Consume atomically: expiry, browser binding and replay prevention apply before exchanging the code.
  const attempt = await db.prepare(`DELETE FROM app_oauth_states WHERE state_hash=? AND browser_hash=? AND expires_at>? RETURNING *`)
    .bind(await digest(state), await digest(browser), Date.now()).first<OAuthState>();
  if (!attempt) return failure('google_state');
  returnTo = safeReturnTo(attempt.return_to);
  if (url.searchParams.has('error')) return failure('google_cancelled');
  const code = url.searchParams.get('code');
  if (!code || code.length > 4096) return failure('google_failed');
  try {
    const response = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', signal: AbortSignal.timeout(10_000),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ code, client_id: env.GOOGLE_CLIENT_ID!, client_secret: env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: googleCallback(url.origin), grant_type: 'authorization_code', code_verifier: attempt.verifier }) });
    const tokens = await response.json() as { id_token?: string };
    if (!response.ok || !tokens.id_token) return failure('google_failed');
    const identity = await verifyGoogleToken(tokens.id_token, env.GOOGLE_CLIENT_ID!, attempt.nonce);
    const email = normalizeEmail(identity.email);
    if (!email) return failure('google_failed');
    const googleUser = await db.prepare('SELECT id FROM app_users WHERE google_sub=?').bind(identity.sub).first<{ id: string }>();
    let userId = googleUser?.id;
    if (attempt.link_user_id) {
      // Linking requires the original authenticated account, not just a matching email address.
      const currentUser = await getUser();
      if (currentUser?.userId !== attempt.link_user_id || (userId && userId !== currentUser.userId)) return failure('google_link');
      const updated = await db.prepare('UPDATE app_users SET google_sub=?, updated_at=? WHERE id=? AND (google_sub IS NULL OR google_sub=?) RETURNING id')
        .bind(identity.sub, Date.now(), currentUser.userId, identity.sub).first<{ id: string }>();
      if (!updated) return failure('google_link');
      userId = currentUser.userId;
    } else if (!userId) {
      const existing = await db.prepare('SELECT id FROM app_users WHERE email=?').bind(email).first();
      if (existing) return failure('google_existing');
      userId = crypto.randomUUID();
      const now = Date.now();
      await db.prepare(`INSERT INTO app_users (id, email, display_name, google_sub, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`)
        .bind(userId, email, normalizeDisplayName(identity.name, email), identity.sub, now, now).run();
    }
    const session = await createSession(userId);
    const headers = new Headers({ Location: new URL(returnTo, url.origin).href, 'Cache-Control': 'no-store' });
    headers.append('Set-Cookie', sessionCookie(session));
    headers.append('Set-Cookie', googleCookie('', 0));
    return new Response(null, { status: 303, headers });
  } catch {
    // Do not log OAuth codes, tokens, secrets or provider responses.
    return failure('google_failed');
  }
}
