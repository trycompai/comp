import { getDefaultRoute, mergePermissions, resolveBuiltInPermissions } from '@/lib/permissions';
import { auth } from '@/utils/auth';
import { db } from '@db';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function RootPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  // Helper function to build URL with search params
  const buildUrlWithParams = async (path: string): Promise<string> => {
    const params = new URLSearchParams();
    Object.entries(await searchParams).forEach(([key, value]) => {
      if (value !== undefined) {
        if (Array.isArray(value)) {
          value.forEach((v) => params.append(key, v));
        } else {
          params.append(key, value);
        }
      }
    });
    const queryString = params.toString();
    return queryString ? `${path}?${queryString}` : path;
  };

  if (!session) {
    return redirect(await buildUrlWithParams('/auth'));
  }

  const intent = (await searchParams)?.intent;

  // If user is explicitly creating an additional org, go to setup
  if (intent === 'create-additional') {
    return redirect(await buildUrlWithParams('/setup'));
  }

  // Find all organizations the user belongs to (not relying on activeOrganizationId)
  const memberships = await db.member.findMany({
    where: {
      userId: session.user.id,
      deactivated: false,
    },
    select: {
      organizationId: true,
      role: true,
      organization: {
        select: {
          id: true,
          onboardingCompleted: true,
          hasAccess: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  // No memberships - check for pending invites or go to setup
  if (memberships.length === 0) {
    const pendingInvite = await db.invitation.findFirst({
      where: {
        email: session.user.email,
        status: 'pending',
      },
    });

    if (pendingInvite) {
      return redirect(await buildUrlWithParams(`/invite/${pendingInvite.id}`));
    }

    return redirect(await buildUrlWithParams('/setup'));
  }

  // Find the best org to redirect to:
  // 1. Prefer orgs with completed onboarding and access
  // 2. Fall back to first org (most recently joined)
  const readyOrg = memberships.find(
    (m) => m.organization.onboardingCompleted && m.organization.hasAccess,
  );

  const targetOrg = readyOrg?.organization || memberships[0].organization;

  // If org hasn't completed onboarding, route to onboarding flow
  if (!targetOrg.onboardingCompleted) {
    return redirect(await buildUrlWithParams(`/onboarding/${targetOrg.id}`));
  }

  // If org doesn't have access, route to upgrade
  if (!targetOrg.hasAccess) {
    return redirect(await buildUrlWithParams(`/upgrade/${targetOrg.id}`));
  }

  // Resolve user's default route based on their permissions
  const targetMembership = memberships.find((m) => m.organization.id === targetOrg.id);
  const { permissions, customRoleNames } = resolveBuiltInPermissions(targetMembership?.role);

  if (customRoleNames.length > 0) {
    const customRoles = await db.organizationRole.findMany({
      where: {
        organizationId: targetOrg.id,
        name: { in: customRoleNames },
      },
      select: { permissions: true },
    });
    for (const role of customRoles) {
      if (!role.permissions) continue;
      const parsed =
        typeof role.permissions === 'string' ? JSON.parse(role.permissions) : role.permissions;
      if (parsed && typeof parsed === 'object') {
        mergePermissions(permissions, parsed as Record<string, string[]>);
      }
    }
  }

  const defaultRoute = getDefaultRoute(permissions, targetOrg.id);

  return redirect(await buildUrlWithParams(defaultRoute ?? '/no-access'));
}
