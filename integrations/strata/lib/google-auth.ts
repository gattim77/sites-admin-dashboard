import { env } from 'cloudflare:workers';
export const GOOGLE_COOKIE = '__Host-strata-google';
export function googleConfigured() { return !!env.GOOGLE_CLIENT_ID && !!env.GOOGLE_CLIENT_SECRET; }
export function googleCallback(origin: string) { return new URL('/api/auth/google/callback', origin).href; }
export function googleCookie(value: string, maxAge = 600) {
  return `${GOOGLE_COOKIE}=${value}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`;
}
export function googleBrowserToken(request: Request) {
  return request.headers.get('cookie')?.split(';').map(part => part.trim()).find(part => part.startsWith(GOOGLE_COOKIE + '='))?.slice(GOOGLE_COOKIE.length + 1);
}
export type OAuthState = { state_hash: string; browser_hash: string; nonce: string; verifier: string; return_to: string; link_user_id: string | null; expires_at: number };
