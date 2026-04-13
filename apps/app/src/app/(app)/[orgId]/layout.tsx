import { getFeatureFlags } from '@/app/posthog';
import { APP_AWS_ORG_ASSETS_BUCKET, s3Client } from '@/app/s3';
import { TriggerTokenProvider } from '@/components/trigger-token-provider';
import { serverApi } from '@/lib/api-server';
import { canAccessApp, parseRolesString } from '@/lib/permissions';
import { resolveUserPermissions } from '@/lib/permissions.server';
import type { OrganizationFromMe } from '@/types';
import { auth } from '@/utils/auth';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@/lib/s3-presigner';
import { db, Role } from '@db/server';
import dynamic from 'next/dynamic';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { AppShellWrapper } from './components/AppShellWrapper';

const HotKeys = dynamic(() => import('@/components/hot-keys').then((mod) => mod.HotKeys), {
  ssr: true,
});

export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgId: string }>;
}) {
  const { orgId: requestedOrgId } = await params;

  const cookieStore = await cookies();
  const isCollapsed = cookieStore.get('sidebar-collapsed')?.value === 'true';
  const publicAccessToken = cookieStore.get('publicAccessToken')?.value || undefined;

  // Get headers once to avoid multiple async calls
  const requestHeaders = await headers();

  // Check if user has access to this organization
  const session = await auth.api.getSession({
    headers: requestHeaders,
  });

  if (!session) {
    console.log('no session');
    return redirect('/auth');
  }

  // First check if the organization exists and load access flags
  const organization = await db.organization.findUnique({
    where: { id: requestedOrgId },
  });

  if (!organization) {
    // Organization doesn't exist
    return redirect('/auth/not-found');
  }

  const member = await db.member.findFirst({
    where: {
      userId: session.user.id,
      organizationId: requestedOrgId,
      deactivated: false,
    },
  });

  if (!member) {
    // User doesn't have access to this organization
    return redirect('/auth/unauthorized');
  }

  // Sync activeOrganizationId if it doesn't match the URL's orgId.
  // Uses better-auth's API so both server and client-side session state stay in sync.
  const currentActiveOrgId = session.session.activeOrganizationId;
  if (!currentActiveOrgId || currentActiveOrgId !== requestedOrgId) {
    try {
      await auth.api.setActiveOrganization({
        headers: requestHeaders,
        body: { organizationId: requestedOrgId },
      });
    } catch (error) {
      console.error('[Layout] Failed to sync activeOrganizationId:', error);
    }
  }

  // Resolve effective permissions from all roles (built-in + custom)
  const permissions = await resolveUserPermissions(member.role, requestedOrgId);

  // Check if user can access the main app (has app:read or any app route permission)
  const hasAppAccess = canAccessApp(permissions);
  if (!hasAppAccess) {
    return redirect('/no-access');
  }

  // Parse roles for UI display purposes (auditor-specific UI)
  const roles = parseRolesString(member.role);

  const isUserAdmin = session.user.role === 'admin';

  if (!isUserAdmin) {
    if (!organization.hasAccess) {
      return redirect(`/upgrade/${organization.id}`);
    }

    if (!organization.onboardingCompleted) {
      return redirect(`/onboarding/${organization.id}`);
    }
  }

  const onboarding = await db.onboarding.findFirst({
    where: {
      organizationId: requestedOrgId,
    },
  });

  // Fetch organizations for sidebar via API
  const meRes = await serverApi.get<{ organizations: OrganizationFromMe[] }>('/v1/auth/me');
  const organizations = meRes.data?.organizations ?? [];

  // Generate logo URLs for all organizations
  const logoUrls: Record<string, string> = {};
  if (s3Client && APP_AWS_ORG_ASSETS_BUCKET) {
    await Promise.all(
      organizations.map(async (org) => {
        if (org.logo) {
          try {
            const command = new GetObjectCommand({
              Bucket: APP_AWS_ORG_ASSETS_BUCKET,
              Key: org.logo,
            });
            logoUrls[org.id] = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
          } catch {
            // Logo not available
          }
        }
      }),
    );
  }

  // Check feature flags for menu items
  let isQuestionnaireEnabled = false;
  let isTrustNdaEnabled = false;
  let isWebAutomationsEnabled = false;
  let isSecurityEnabled = false;
  if (session?.user?.id) {
    const flags = await getFeatureFlags(session.user.id);
    isQuestionnaireEnabled = flags['ai-vendor-questionnaire'] === true;
    isTrustNdaEnabled =
      flags['is-trust-nda-enabled'] === true || flags['is-trust-nda-enabled'] === 'true';
    isWebAutomationsEnabled =
      flags['is-web-automations-enabled'] === true ||
      flags['is-web-automations-enabled'] === 'true';
    isSecurityEnabled =
      flags['is-security-enabled'] === true || flags['is-security-enabled'] === 'true';
  }

  // Check auditor role
  const hasAuditorRole = roles.includes(Role.auditor);
  const isOnlyAuditor = hasAuditorRole && roles.length === 1;

  // User data for navbar
  const user = {
    name: session.user.name,
    email: session.user.email,
    image: session.user.image ?? null,
  };

  return (
    <TriggerTokenProvider
      triggerJobId={onboarding?.triggerJobId || undefined}
      initialToken={publicAccessToken || undefined}
    >
      <AppShellWrapper
        organization={organization}
        organizations={organizations}
        logoUrls={logoUrls}
        onboarding={onboarding}
        isCollapsed={isCollapsed}
        isQuestionnaireEnabled={isQuestionnaireEnabled}
        isTrustNdaEnabled={isTrustNdaEnabled}
        isWebAutomationsEnabled={isWebAutomationsEnabled}
        isSecurityEnabled={isSecurityEnabled}
        hasAuditorRole={hasAuditorRole}
        isOnlyAuditor={isOnlyAuditor}
        permissions={permissions}
        user={user}
        isAdmin={isUserAdmin}
      >
        {children}
      </AppShellWrapper>
      <HotKeys />
    </TriggerTokenProvider>
  );
}
