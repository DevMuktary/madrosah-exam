// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Read the secure HTTP-only cookie
  const session = request.cookies.get('student_session')?.value;

  // 1. Protect the Examination Portal
  if (pathname.startsWith('/exam')) {
    if (!session) {
      // If there is no active session, redirect immediately to login
      const loginUrl = new URL('/', request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  // 2. Prevent active sessions from seeing the login screen
  if (pathname === '/') {
    if (session) {
      // If they already have a session, push them straight to their exam
      const examUrl = new URL('/exam', request.url);
      return NextResponse.redirect(examUrl);
    }
  }

  // Allow all other requests to proceed normally
  return NextResponse.next();
}

// Specify exactly which routes this middleware should run on to save compute resources
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
