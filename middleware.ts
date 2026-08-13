import { NextResponse, type NextRequest } from 'next/server';
import { verifyAuthToken } from '@/lib/auth/jwt';

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('admin_token')?.value;

  // Protect all /admin routes
  if (request.nextUrl.pathname.startsWith('/admin')) {
    const verified = token ? await verifyAuthToken(token) : null;

    if (!verified) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('redirectTo', request.nextUrl.pathname);
      return NextResponse.redirect(url);
    }
  }


  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
