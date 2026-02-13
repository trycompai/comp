import { auth } from '@/utils/auth';
import { db } from '@db';
import { NextRequest, NextResponse } from 'next/server';

export const config = {
  matcher: [
    // Skip auth-related routes (removed onboarding from exclusions)
    '/((?!api|_next/static|_next/image|favicon.ico|monitoring|ingest|research).*)',
  ],
};

/**
 * Known route prefixes that are NOT org routes.
 * Any first path segment not in this set is treated as an orgId.
 */
const NON_ORG_ROUTE_PREFIXES = new Set([
  'auth',
  'admin',
  'invite',
  'no-access',
  'onboarding',
  'setup',
  'upgrade',
  'unsubscribe',
]);

/**
 * Extract the orgId from the first path segment if it's an org route.
 * Returns null for non-org routes (e.g. /auth, /setup, /invite/...).
 */
function extractOrgId(pathname: string): string | null {
  // Remove leading slash, split by /
  const segments = pathname.replace(/^\//, '').split('/');
  const firstSegment = segments[0];

  if (!firstSegment) return null;
  if (NON_ORG_ROUTE_PREFIXES.has(firstSegment)) return null;

  return firstSegment;
}

export async function proxy(request: NextRequest) {
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
      const originalPath = `${nextUrl.pathname}${nextUrl.search}`;
      if (originalPath !== '/') {
        url.searchParams.set('redirectTo', originalPath);
      }
      return NextResponse.redirect(url);
    }

    // 2. Organization membership check
    // If the user is authenticated and accessing an org route, verify membership.
    const orgId = extractOrgId(nextUrl.pathname);
    if (hasToken && orgId) {
      const session = await auth.api.getSession({
        headers: requestHeaders,
      });

      if (session) {
        const member = await db.member.findFirst({
          where: {
            userId: session.user.id,
            organizationId: orgId,
            deactivated: false,
          },
          select: { id: true },
        });

        if (!member) {
          return new NextResponse('Forbidden', { status: 403 });
        }
      }
    }

    return response;
  } catch (err) {
    console.error('[Proxy] error', err);
    return NextResponse.next();
  }
}
