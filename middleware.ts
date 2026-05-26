import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { getAuthSecret } from '@/lib/auth/secret';

/**
 * Edge middleware — first line of defense for `/admin/*` and
 * `/api/admin/*`. Non-admins never even hit the route handlers.
 *
 * Layer 2 (server guard in layout / requireAdmin in API) still runs and is
 * the actual security boundary. This middleware is mainly for good UX
 * (redirects to `/` instead of rendering a 404/403 shell).
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const token = await getToken({
    req,
    secret: getAuthSecret(),
  });

  const isApi = pathname.startsWith('/api/admin');

  // Not signed in.
  if (!token) {
    if (isApi) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const loginUrl = new URL('/', req.url);
    loginUrl.searchParams.set('auth', 'required');
    return NextResponse.redirect(loginUrl);
  }

  // Signed in but not admin.
  if (token.role !== 'admin') {
    if (isApi) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.redirect(new URL('/', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
