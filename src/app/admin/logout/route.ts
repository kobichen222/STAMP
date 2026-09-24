import { NextResponse } from 'next/server';
import { ADMIN_COOKIE } from '@/server/admin-auth';

export async function GET(req: Request) {
  const res = NextResponse.redirect(new URL('/admin/login/', req.url));
  res.cookies.delete(ADMIN_COOKIE);
  return res;
}
