import { getServerSession, Session } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { NextResponse } from 'next/server';
import { redirect } from 'next/navigation';

/**
 * Server-side guard for admin-only surfaces.
 *
 * Use in server components (throws redirect) and in API routes (returns a
 * NextResponse to short-circuit). Defense in depth — runs in addition to
 * the edge middleware.
 */

export async function getAdminSession(): Promise<Session | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'admin') return null;
  return session;
}

/** For server components — redirects non-admins to `/`. */
export async function requireAdminPage(): Promise<Session> {
  const session = await getAdminSession();
  if (!session) redirect('/');
  return session;
}

/** For API routes — returns a Response to throw if unauthorized, else null. */
export async function requireAdminApi(): Promise<NextResponse | null> {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return null;
}
