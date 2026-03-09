import { serverApi } from '@/lib/api-server';
import { getDefaultRoute, mergePermissions, resolveBuiltInPermissions } from '@/lib/permissions';
import { auth } from '@/utils/auth';
import { db } from '@db';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

interface OrgInfo {
  id: string;
  onboardingCompleted: boolean;
  hasAccess: boolean;
  memberRole: string;
}

interface AuthMeResponse {
  organizations: OrgInfo[];
  pendingInvitation: { id: string } | null;
}

export default async function RootPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

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

  if (intent === 'create-additional') {
    return redirect(await buildUrlWithParams('/setup'));
  }

  const meRes = await serverApi.get<AuthMeResponse>('/v1/auth/me');
  const memberships = meRes.data?.organizations ?? [];
  const pendingInvitation = meRes.data?.pendingInvitation;

  if (memberships.length === 0) {
    if (pendingInvitation) {
      return redirect(await buildUrlWithParams(`/invite/${pendingInvitation.id}`));
    }
    return redirect(await buildUrlWithParams('/setup'));
  }

  const readyOrg = memberships.find(
    (m) => m.onboardingCompleted && m.hasAccess,
  );
  const targetOrg = readyOrg || memberships[0];

  if (!targetOrg.onboardingCompleted) {
    return redirect(await buildUrlWithParams(`/onboarding/${targetOrg.id}`));
  }

  if (!targetOrg.hasAccess) {
    return redirect(await buildUrlWithParams(`/upgrade/${targetOrg.id}`));
  }

  // Resolve permissions for default route
  const { permissions, customRoleNames } = resolveBuiltInPermissions(
    targetOrg.memberRole,
  );

  if (customRoleNames.length > 0) {
    // Custom role resolution still needs DB (infrastructure auth concern)
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
        typeof role.permissions === 'string'
          ? JSON.parse(role.permissions)
          : role.permissions;
      if (parsed && typeof parsed === 'object') {
        mergePermissions(permissions, parsed as Record<string, string[]>);
      }
    }
  }

  const defaultRoute = getDefaultRoute(permissions, targetOrg.id);

  return redirect(await buildUrlWithParams(defaultRoute ?? '/no-access'));
}
