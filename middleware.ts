import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { getAuthSecret } from '@/lib/auth/secret';

/**
 * Edge middleware — first line of defense for `/admin/*`, `/api/admin/*`
 * (admin role) and `/portal/*`, `/api/portal/*` (booster role). Wrong-role
 * visitors never even hit the route handlers.
 *
 * Layer 2 (server guard in layout / requireAdmin / getBoosterContext) still
 * runs and is the actual security boundary. This middleware is mainly for
 * good UX (redirects to `/` instead of rendering a 404/403 shell). For the
 * portal, the role only GATES the route — identity comes from the
 * boosters.user_id FK resolved server-side.
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const token = await getToken({
    req,
    secret: getAuthSecret(),
  });

  const isPortal = pathname.startsWith('/portal') || pathname.startsWith('/api/portal');
  const isApi = pathname.startsWith('/api/admin') || pathname.startsWith('/api/portal');
  const requiredRole = isPortal ? 'booster' : 'admin';

  // Not signed in.
  if (!token) {
    if (isApi) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const loginUrl = new URL('/', req.url);
    loginUrl.searchParams.set('auth', 'required');
    return NextResponse.redirect(loginUrl);
  }

  // Signed in but wrong role.
  if (token.role !== requiredRole) {
    if (isApi) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.redirect(new URL('/', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*', '/portal/:path*', '/api/portal/:path*'],
};
