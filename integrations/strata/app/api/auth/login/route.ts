import {allowAuthAttempt} from '@/lib/auth-request';
import {body as readBody} from '@/lib/auth-request';
import { createSession, normalizeEmail, safeReturnTo, sessionCookie, verifyPassword } from '@/lib/auth';
import { database, safeOrigin } from '@/lib/auth-storage';

const MAX_FAILURES = 8;
const LOCK_MS = 15 * 60 * 1000;

export async function POST(request: Request) {
  if (!safeOrigin(request)) return Response.json({ error: 'Invalid request.' }, { status: 403 });
  if (!await allowAuthAttempt(request, 'login', 40)) return Response.json({error:'Too many attempts. Try again later.'},{status:429});
  const body = await readBody(request).catch(() => null) as Record<string, unknown> | null;
  const email = normalizeEmail(body?.email);
  const password = typeof body?.password === 'string' ? body.password : '';
  if (!email || !password || password.length > 200) return Response.json({ error: 'Email or password is incorrect.' }, { status: 401 });
  const db = database();
  const limit = await db.prepare('SELECT failed_count, locked_until FROM app_login_limits WHERE email = ?').bind(email).first<{ failed_count: number; locked_until: number }>();
  if (limit && limit.locked_until > Date.now()) return Response.json({ error: 'Too many attempts. Please try again in 15 minutes.' }, { status: 429 });
  if(limit && limit.locked_until > 0 && limit.locked_until <= Date.now()) await db.prepare('DELETE FROM app_login_limits WHERE email = ? AND locked_until <= ?').bind(email,Date.now()).run();
  const row = await db.prepare('SELECT u.id, u.password_salt, u.password_hash FROM app_users u LEFT JOIN third_admin_controls c ON c.user_id=u.id WHERE u.email = ? AND COALESCE(c.status,\'active\')=\'active\'').bind(email)
    .first<{ id: string; password_salt: string | null; password_hash: string | null }>();
  const valid = !!row?.password_salt && !!row.password_hash && await verifyPassword(password, row.password_salt, row.password_hash);
  if (!valid) {
    await db.prepare(`INSERT INTO app_login_limits (email, failed_count, locked_until) VALUES (?, 1, 0)
      ON CONFLICT(email) DO UPDATE SET
      failed_count = CASE WHEN app_login_limits.locked_until > ? THEN app_login_limits.failed_count ELSE app_login_limits.failed_count + 1 END,
      locked_until = CASE WHEN app_login_limits.locked_until > ? THEN app_login_limits.locked_until WHEN app_login_limits.failed_count + 1 >= ? THEN ? ELSE 0 END`)
      .bind(email, Date.now(), Date.now(), MAX_FAILURES, Date.now() + LOCK_MS).run();
    return Response.json({ error: 'Email or password is incorrect.' }, { status: 401 });
  }
  await db.prepare('DELETE FROM app_login_limits WHERE email = ?').bind(email).run();
  const token = await createSession(row.id);
  return Response.json({ ok: true, returnTo: safeReturnTo(body?.returnTo) }, { headers: { 'Set-Cookie': sessionCookie(token), 'Cache-Control': 'no-store' } });
}
