export async function body(request: Request) {
  if (Number(request.headers.get('content-length') || 0) > 8192) throw Error('Request too large');
  const raw = await request.text();
  if (raw.length > 8192) throw Error('Request too large');
  return JSON.parse(raw);
}

// Cloudflare supplies this header at the edge. Hash it before storing short-lived limits.
export async function allowAuthAttempt(request: Request, kind: string, max = 30) {
  const {database,digest} = await import('./auth-storage');
  const db = database(), now = Date.now(), window = Math.floor(now / 900_000);
  const key = await digest(`${kind}:${request.headers.get('cf-connecting-ip') || 'local'}:${window}`);
  const row = await db.prepare(`INSERT INTO app_request_limits (key, attempts, expires_at) VALUES (?,1,?)
    ON CONFLICT(key) DO UPDATE SET attempts=attempts+1 RETURNING attempts`).bind(key,(window+1)*900_000).first<{attempts:number}>();
  await db.prepare('DELETE FROM app_request_limits WHERE expires_at < ?').bind(now).run();
  return !!row && row.attempts <= max;
}
