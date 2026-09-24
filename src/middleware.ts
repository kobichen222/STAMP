import { NextResponse, type NextRequest } from 'next/server';
import { findRedirect } from '@/lib/redirects';
import { ADMIN_COOKIE, verifyAdminToken } from '@/server/admin-auth';

export async function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;

  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) {
    const ok = await verifyAdminToken(req.cookies.get(ADMIN_COOKIE)?.value);
    if (!ok) return NextResponse.redirect(new URL('/admin/login/', req.url));
  }
  if (pathname.startsWith('/api/admin')) {
    const ok = await verifyAdminToken(req.cookies.get(ADMIN_COOKIE)?.value);
    if (!ok) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    return NextResponse.next();
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
