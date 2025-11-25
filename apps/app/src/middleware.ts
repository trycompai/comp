// Note: middleware must not call Prisma/BetterAuth APIs. Use cookie presence only.
import { NextRequest, NextResponse } from 'next/server';

export const config = {
  matcher: [
    // Skip auth-related routes (removed onboarding from exclusions)
    '/((?!api|_next/static|_next/image|favicon.ico|monitoring|ingest|research).*)',
  ],
};

export async function middleware(request: NextRequest) {
  try {
    // E2E Test Mode: Check for test auth header
    if (process.env.E2E_TEST_MODE === 'true') {
      const testAuthHeader = request.headers.get('x-e2e-test-auth');
      if (testAuthHeader) {
        try {
          const testAuth = JSON.parse(testAuthHeader);
          if (testAuth.bypass) {
            // Allow the request to proceed without auth checks
            const response = NextResponse.next();
            response.headers.set('x-pathname', request.nextUrl.pathname);
            return response;
          }
        } catch (e) {
          // Invalid test auth header, continue with normal auth flow
        }
      }
    }

    // Cookie-only gating (auth will validate server-side on actual routes)
    const secureCookieName = '__Secure-better-auth.session_token';
    const fallbackCookieName = 'better-auth.session_token';

    let sessionToken = request.cookies.get(secureCookieName)?.value;
    if (!sessionToken) {
      sessionToken = request.cookies.get(fallbackCookieName)?.value;
    }
    const hasToken = Boolean(sessionToken);
    const nextUrl = request.nextUrl;
    const requestHeaders = new Headers(request.headers);

    // Add x-path-name and selected query hints for server components
    const response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
    response.headers.set('x-pathname', nextUrl.pathname);
    const intent = nextUrl.searchParams.get('intent') || '';
    if (intent) {
      // Also forward intent to the request headers so server components can read it
      requestHeaders.set('x-intent', intent);
      // Recreate response with updated forwarded headers
      return NextResponse.next({ request: { headers: requestHeaders } });
    }

    // Allow unauthenticated access to invite routes
    if (nextUrl.pathname.startsWith('/invite/')) {
      return response;
    }

    // Allow unauthenticated access to unsubscribe routes
    if (nextUrl.pathname === '/unsubscribe' || nextUrl.pathname.startsWith('/unsubscribe/')) {
      return response;
    }

    // 1. Not authenticated
    if (!hasToken && nextUrl.pathname !== '/auth') {
      const url = new URL('/auth', request.url);
      // Preserve existing search params
      nextUrl.searchParams.forEach((value, key) => {
        url.searchParams.set(key, value);
      });
      return NextResponse.redirect(url);
    }

    // 2. Authenticated users (avoid DB calls in middleware)
    if (hasToken) {
      const isRootPath = nextUrl.pathname === '/';

      // If user hits root: route based on active org presence
      if (isRootPath) {
        const url = new URL('/setup', request.url);
        nextUrl.searchParams.forEach((value, key) => {
          url.searchParams.set(key, value);
        });
        return NextResponse.redirect(url);
      }
    }

    return response;
  } catch (err) {
    console.error('[MW] error', err);
    return NextResponse.next();
  }
}
