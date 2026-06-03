// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Read the secure HTTP-only cookie for students
  const session = request.cookies.get('student_session')?.value;

  // ==========================================
  // 1. PROTECT ADMIN ROUTES (Basic Auth)
  // ==========================================
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    const basicAuth = request.headers.get('authorization');

    if (basicAuth) {
      const authValue = basicAuth.split(' ')[1];
      // Decode the base64 string sent by the browser
      const [user, pwd] = atob(authValue).split(':');

      // Set your Admin Username and Password here
      // (In production, use process.env.ADMIN_USER and process.env.ADMIN_PASS)
      if (user === 'admin' && pwd === 'mutoonSecure2026') {
        return NextResponse.next(); // Allow access
      }
    }

    // If no auth header or wrong password, force the browser login prompt
    return new NextResponse('Unauthorized Access', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="Secure Admin Area"',
      },
    });
  }

  // ==========================================
  // 2. PROTECT STUDENT ROUTES
  // ==========================================
  if (pathname.startsWith('/exam')) {
    if (!session) {
      // If there is no active session, redirect immediately to login
      const loginUrl = new URL('/', request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  // 3. Prevent active students from seeing the login screen
  if (pathname === '/') {
    if (session) {
      const examUrl = new URL('/exam', request.url);
      return NextResponse.redirect(examUrl);
    }
  }

  // Allow all other requests to proceed normally
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api/auth|_next/static|_next/image|favicon.ico).*)',
  ],
};
