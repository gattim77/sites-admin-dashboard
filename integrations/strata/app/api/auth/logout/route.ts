import { cookies } from 'next/headers';
import { clearSessionCookie, deleteSession, USER_COOKIE } from '@/lib/auth';
import { safeOrigin } from '@/lib/auth-storage';

export async function POST(request: Request) {
  if (!safeOrigin(request)) return new Response(null, { status: 403 });
  await deleteSession((await cookies()).get(USER_COOKIE)?.value);
  return Response.json({ok:true}, { status: 200, headers: { 'Set-Cookie': clearSessionCookie(), 'Cache-Control': 'no-store' } });
}
