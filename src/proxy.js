import { NextResponse } from 'next/server';

// Decode base64url to JSON string without node crypto dependencies for Edge runtime safety
function decodeTokenPayload(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    
    const jsonStr = atob(base64);
    return JSON.parse(jsonStr);
  } catch (err) {
    return null;
  }
}

export function proxy(req) {
  const { pathname } = req.nextUrl;

  // Static files and API routes (except some) should be skipped
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/') ||
    pathname.includes('.') ||
    pathname === '/login' ||
    pathname === '/signup' ||
    pathname === '/forgot-password'
  ) {
    return NextResponse.next();
  }

  const tokenCookie = req.cookies.get('assetflow_token');
  const token = tokenCookie ? tokenCookie.value : null;
  const payload = token ? decodeTokenPayload(token) : null;

  // 1. If not authenticated, redirect to /login
  if (!payload || (payload.exp && Math.floor(Date.now() / 1000) > payload.exp)) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    
    const response = NextResponse.redirect(loginUrl);
    if (tokenCookie) {
      response.cookies.delete('assetflow_token');
    }
    return response;
  }

  const userRole = payload.role;

  // 2. Role-based Route Protection
  if (pathname.startsWith('/organization') && userRole !== 'Admin') {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  if (pathname.startsWith('/audits') && !['Admin', 'Asset Manager'].includes(userRole)) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  if (pathname.startsWith('/reports') && !['Admin', 'Asset Manager', 'Department Head'].includes(userRole)) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
