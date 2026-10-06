import {allowAuthAttempt} from '@/lib/auth-request';
import {body as readBody} from '@/lib/auth-request';
import { createSession, normalizeDisplayName, normalizeEmail, passwordHash, safeReturnTo, sessionCookie } from '@/lib/auth';
import { database, safeOrigin } from '@/lib/auth-storage';

export async function POST(request: Request) {
  if (!safeOrigin(request)) return Response.json({ error: 'Invalid request.' }, { status: 403 });
  if (!await allowAuthAttempt(request, 'register', 10)) return Response.json({error:'Too many attempts. Try again later.'},{status:429});
  const body = await readBody(request).catch(() => null) as Record<string, unknown> | null;
  const email = normalizeEmail(body?.email);
  const password = typeof body?.password === 'string' ? body.password : '';
  if (!email) return Response.json({ error: 'Enter a valid email address.' }, { status: 400 });
  if (password.length < 10 || password.length > 200) return Response.json({ error: 'Use a password of 10 to 200 characters.' }, { status: 400 });
  const existing = await database().prepare('SELECT id FROM app_users WHERE email = ?').bind(email).first();
  if (existing) return Response.json({ error: 'An account already exists. Please sign in.' }, { status: 409 });
  const { salt, hash } = await passwordHash(password);
  const userId = crypto.randomUUID();
  const now = Date.now();
  await database().prepare(`INSERT INTO app_users (id, email, display_name, password_salt, password_hash, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)`).bind(userId, email, normalizeDisplayName(body?.name, email), salt, hash, now, now).run();
  const token = await createSession(userId);
  return Response.json({ ok: true, returnTo: safeReturnTo(body?.returnTo) }, { headers: { 'Set-Cookie': sessionCookie(token), 'Cache-Control': 'no-store' } });
}
