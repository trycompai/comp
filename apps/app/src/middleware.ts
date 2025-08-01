import { addCorsHeaders } from '@/lib/cors';
import { auth } from '@/utils/auth';
import { db } from '@db';
import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export const config = {
  runtime: 'nodejs',
  matcher: [
    // Include API routes for CORS handling, exclude static assets
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};

// Unprotected routes
const UNPROTECTED_ROUTES = ['/auth', '/invite', '/setup', '/upgrade'];

function isUnprotectedRoute(pathname: string): boolean {
  return UNPROTECTED_ROUTES.some((route) => pathname.includes(route));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Handle CORS for API routes
  if (pathname.startsWith('/api/')) {
    // Handle preflight OPTIONS requests
    if (request.method === 'OPTIONS') {
      const response = new NextResponse(null, { status: 200 });
      return addCorsHeaders(response, request.headers.get('origin'));
    }
  }

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
          // Add CORS headers for API routes
          if (pathname.startsWith('/api/')) {
            return addCorsHeaders(response, request.headers.get('origin'));
          }
          return response;
        }
      } catch (e) {
        // Invalid test auth header, continue with normal auth flow
      }
    }
  }

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const response = NextResponse.next();
  const nextUrl = request.nextUrl;

  // Add x-path-name
  response.headers.set('x-pathname', nextUrl.pathname);

  // Allow unauthenticated access to invite routes
  if (nextUrl.pathname.startsWith('/invite/')) {
    return response;
  }

  // 1. Not authenticated
  if (!session && nextUrl.pathname !== '/auth') {
    const url = new URL('/auth', request.url);
    // Preserve existing search params
    nextUrl.searchParams.forEach((value, key) => {
      url.searchParams.set(key, value);
    });
    return NextResponse.redirect(url);
  }

  // 2. Authenticated users
  if (session) {
    // Special handling for /setup path - it's used for creating organizations
    if (nextUrl.pathname.startsWith('/setup')) {
      // Check if user already has an organization
      const hasOrg = await db.organization.findFirst({
        where: {
          members: {
            some: {
              userId: session.user.id,
            },
          },
        },
      });

      // Allow access if:
      // - User has no organization (new user)
      // - User is intentionally creating additional org (intent=create-additional)
      // - User is in a setup session (has setupId in path)
      const isIntentionalSetup = nextUrl.searchParams.get('intent') === 'create-additional';
      const isSetupSession = nextUrl.pathname.match(/^\/setup\/[a-zA-Z0-9]+/);

      if (!hasOrg || isIntentionalSetup || isSetupSession) {
        return response;
      }

      // If user has org and not intentionally creating new one, redirect to their org
      if (hasOrg && !isIntentionalSetup && !isSetupSession) {
        const url = new URL(`/${hasOrg.id}/frameworks`, request.url);
        // Preserve existing search params
        nextUrl.searchParams.forEach((value, key) => {
          url.searchParams.set(key, value);
        });
        return NextResponse.redirect(url);
      }
    }

    const orgMatch = nextUrl.pathname.match(/^\/org_[a-zA-Z0-9]+/);
    if (orgMatch && !isUnprotectedRoute(nextUrl.pathname)) {
      const orgId = orgMatch[0].substring(1);

      const foundOrg = await db.organization.findFirst({
        where: { id: orgId },
        select: { hasAccess: true },
      });

      const hasAccess = foundOrg?.hasAccess;

      if (!hasAccess) {
        const url = new URL(`/upgrade/${orgId}`, request.url);
        // Preserve existing search params
        nextUrl.searchParams.forEach((value, key) => {
          url.searchParams.set(key, value);
        });
        return NextResponse.redirect(url);
      }

      // Check onboarding status for paid users
      const org = await db.organization.findUnique({
        where: { id: orgId },
        select: { onboardingCompleted: true },
      });

      // If they have a subscription but haven't completed onboarding, redirect
      // Only redirect if onboardingCompleted is explicitly false (not null/undefined)
      if (org && org.onboardingCompleted === false && !nextUrl.pathname.includes('/onboarding')) {
        console.log(`[MIDDLEWARE] Redirecting org ${orgId} to complete onboarding`);
        const url = new URL(`/onboarding/${orgId}`, request.url);
        // Preserve existing search params
        nextUrl.searchParams.forEach((value, key) => {
          url.searchParams.set(key, value);
        });
        return NextResponse.redirect(url);
      }
    }

    // Heal sessions for organization-dependent routes
    const isOrgRoute = nextUrl.pathname.includes('/org_');
    const isRootPath = nextUrl.pathname === '/';

    if ((isOrgRoute || isRootPath) && !session.session.activeOrganizationId) {
      // Try to find and set an organization for the user
      const userOrg = await db.organization.findFirst({
        where: {
          members: {
            some: {
              userId: session.user.id,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      if (userOrg) {
        // Set the active organization
        await auth.api.setActiveOrganization({
          headers: await headers(),
          body: {
            organizationId: userOrg.id,
          },
        });

        // Refresh to get the updated session
        const url = new URL(nextUrl.pathname, request.url);
        // Preserve existing search params
        nextUrl.searchParams.forEach((value, key) => {
          url.searchParams.set(key, value);
        });
        return NextResponse.redirect(url);
      }
    }
  }

  // Add CORS headers for API routes
  if (pathname.startsWith('/api/')) {
    return addCorsHeaders(response, request.headers.get('origin'));
  }

  return response;
}
