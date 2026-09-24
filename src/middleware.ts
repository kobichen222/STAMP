import { NextResponse, type NextRequest } from 'next/server';
import { findRedirect } from '@/lib/redirects';
import { ADMIN_COOKIE, productionAllowed, verifyAdminToken } from '@/server/admin-auth';

export async function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;

  if ((pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) || pathname.startsWith('/api/admin')) {
    const role = await verifyAdminToken(req.cookies.get(ADMIN_COOKIE)?.value);
    const api = pathname.startsWith('/api/');
    if (!role) return api ? NextResponse.json({ error: 'unauthorized' }, { status: 401 }) : NextResponse.redirect(new URL('/admin/login/', req.url));
    if (role === 'production' && !productionAllowed(pathname)) {
      return api ? NextResponse.json({ error: 'forbidden' }, { status: 403 }) : NextResponse.redirect(new URL('/admin/production/', req.url));
    }
    const res = NextResponse.next();
    res.headers.set('X-Robots-Tag', 'noindex, nofollow');
    return res;
  }

  // 301s from the WordPress site (pages, products, categories, ?p= links).
  const to = findRedirect(pathname, searchParams);
  if (to) {
    const url = req.nextUrl.clone();
    url.pathname = to;
    url.search = '';
    return NextResponse.redirect(url, 301);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/|fonts/|wp-content/|favicon|robots.txt|sitemap.xml|api/(?!admin)).*)'],
};
