import { auth } from '@/utils/auth';
import { db } from '@comp/db';
import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export const config = {
  runtime: 'nodejs',
  matcher: [
    // Skip auth-related routes
    '/((?!api|_next/static|_next/image|favicon.ico|monitoring|ingest|onboarding|research).*)',
  ],
};

export async function middleware(request: NextRequest) {
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
      const isIntentionalSetup = nextUrl.searchParams.get('intent') === 'create-additional';

      if (!hasOrg || isIntentionalSetup) {
        return response;
      }

      // If user has org and not intentionally creating new one, redirect to their org
      if (hasOrg && !isIntentionalSetup) {
        return NextResponse.redirect(new URL(`/${hasOrg.id}/frameworks`, request.url));
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
        return NextResponse.redirect(new URL(nextUrl.pathname, request.url));
      }
    }
  }

  return response;
}
