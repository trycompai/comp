import { getSubscriptionData } from '@/app/api/stripe/getSubscriptionData';
import { auth } from '@/utils/auth';
import { db } from '@comp/db';
import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export const config = {
  runtime: 'nodejs',
  matcher: [
    // Skip auth-related routes (removed onboarding from exclusions)
    '/((?!api|_next/static|_next/image|favicon.ico|monitoring|ingest|research).*)',
  ],
};

// Routes that don't require subscription
const SUBSCRIPTION_EXEMPT_ROUTES = [
  '/auth',
  '/invite',
  '/setup',
  '/upgrade',
  '/settings/billing',
  '/onboarding',
];

function isSubscriptionExempt(pathname: string): boolean {
  return SUBSCRIPTION_EXEMPT_ROUTES.some((route) => pathname.includes(route));
}

export async function middleware(request: NextRequest) {
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

    // Check subscription status for organization routes
    const orgMatch = nextUrl.pathname.match(/^\/org_[a-zA-Z0-9]+/);
    if (orgMatch && !isSubscriptionExempt(nextUrl.pathname)) {
      const orgId = orgMatch[0].substring(1); // Remove leading slash
      console.log(
        `[MIDDLEWARE] Checking subscription for path: ${nextUrl.pathname}, orgId: ${orgId}`,
      );

      // Check subscription status (handles both Stripe and self-serve)
      const subscription = await getSubscriptionData(orgId);

      // Allow access for valid statuses
      const validStatuses = ['active', 'trialing', 'self-serve', 'past_due', 'paused'];

      // Redirect to upgrade page only if they have no valid subscription
      if (!subscription || !validStatuses.includes(subscription.status)) {
        console.log(
          `[MIDDLEWARE] Redirecting org ${orgId} to upgrade. Status: ${subscription?.status}`,
        );
        const url = new URL(`/upgrade/${orgId}`, request.url);
        // Preserve existing search params
        nextUrl.searchParams.forEach((value, key) => {
          url.searchParams.set(key, value);
        });
        return NextResponse.redirect(url);
      }

      // NEW: Check onboarding status for paid users
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

  return response;
}
