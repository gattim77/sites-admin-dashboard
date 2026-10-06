import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { database, digest, randomUrlSafe } from './auth-storage';

export const USER_COOKIE = '__Host-strata-session';
const SESSION_MS = 30 * 24 * 60 * 60 * 1000;
const PASSWORD_ITERATIONS = 100_000;
const encoder = new TextEncoder();

export type AppUser = {
  userId: string;
  email: string;
  displayName: string;
  fullName: string | null;
};

type UserRow = { id: string; email: string; display_name: string | null };

function toUser(row: UserRow): AppUser {
  return { userId: row.id, email: row.email, displayName: row.display_name || row.email, fullName: row.display_name };
}

export function normalizeEmail(value: unknown) {
  if (typeof value !== 'string') return null;
  const email = value.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254 ? email : null;
}

export function normalizeDisplayName(value: unknown, email: string) {
  if (typeof value !== 'string') return email.split('@')[0];
  const name = value.trim().replace(/\s+/g, ' ');
  return name.length >= 2 && name.length <= 80 ? name : email.split('@')[0];
}

function encode(bytes: Uint8Array) {
  let binary = '';
  bytes.forEach(byte => binary += String.fromCharCode(byte));
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function decode(value: string) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4);
  return Uint8Array.from(atob(padded), char => char.charCodeAt(0));
}

function constantTime(left: string, right: string) {
  let difference = left.length ^ right.length;
  for (let index = 0; index < Math.max(left.length, right.length); index++) {
    difference |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }
  return difference === 0;
}

export async function passwordHash(password: string, salt = randomUrlSafe(24)) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const material = new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: decode(salt), iterations: PASSWORD_ITERATIONS, hash: 'SHA-256' }, key, 256));
  return { salt, hash: `v1:${encode(material)}` };
}

export async function verifyPassword(password: string, salt: string, stored: string) {
  const calculated = await passwordHash(password, salt);
  return constantTime(calculated.hash, stored);
}

export async function getUser(): Promise<AppUser | null> {
  const token = (await cookies()).get(USER_COOKIE)?.value;
  if (!token || !/^[A-Za-z0-9_-]{40,100}$/.test(token)) return null;
  const now = Date.now();
  const row = await database().prepare(`SELECT u.id, u.email, u.display_name, s.expires_at
    FROM app_sessions s JOIN app_users u ON u.id = s.user_id LEFT JOIN third_admin_controls c ON c.user_id=u.id WHERE s.token_hash = ? AND COALESCE(c.status,'active')='active'`)
    .bind(await digest(token)).first<UserRow & { expires_at: number }>();
  if (!row || row.expires_at <= now) return null;
  return toUser(row);
}

export async function requireUser(returnTo = '/') {
  const user = await getUser();
  if (user) return user;
  redirect(`/login?returnTo=${encodeURIComponent(safeReturnTo(returnTo))}`);
}

export async function createSession(userId: string) {
  const token = randomUrlSafe(36);
  const now = Date.now();
  await database().prepare('INSERT INTO app_sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)')
    .bind(await digest(token), userId, now + SESSION_MS, now).run();
  return token;
}

export async function deleteSession(token: string | undefined) {
  if (token && /^[A-Za-z0-9_-]{40,100}$/.test(token)) {
    await database().prepare('DELETE FROM app_sessions WHERE token_hash = ?').bind(await digest(token)).run();
  }
}

export function sessionCookie(token: string, maxAge = Math.floor(SESSION_MS / 1000)) {
  return `${USER_COOKIE}=${token}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`;
}

export function clearSessionCookie() {
  return `${USER_COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`;
}

export function safeReturnTo(value: unknown) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) return '/';
  try {
    const url = new URL(value, 'https://app.local');
    return url.origin === 'https://app.local' ? `${url.pathname}${url.search}` : '/';
  } catch { return '/'; }
}
