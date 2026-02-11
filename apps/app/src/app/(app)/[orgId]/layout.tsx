import { getFeatureFlags } from '@/app/posthog';
import { APP_AWS_ORG_ASSETS_BUCKET, s3Client } from '@/app/s3';
import { TriggerTokenProvider } from '@/components/trigger-token-provider';
import { getOrganizations } from '@/data/getOrganizations';
import { canAccessApp } from '@/lib/permissions';
import { resolveUserPermissions } from '@/lib/permissions.server';
import { auth } from '@/utils/auth';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { db, Role } from '@db';
import dynamic from 'next/dynamic';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { AppShellWrapper } from './components/AppShellWrapper';

// Helper to safely parse comma-separated roles string (used for UI display only)
function parseRolesString(rolesStr: string | null | undefined): Role[] {
  if (!rolesStr) return [];
  return rolesStr
    .split(',')
    .map((r) => r.trim())
    .filter((r) => r in Role) as Role[];
}

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
  // Direct DB update instead of HTTP call to avoid race conditions:
  // Next.js renders layouts and pages in parallel, so child pages may call
  // serverApi before an HTTP-based sync completes. A direct DB write is faster
  // and membership has already been validated above.
  const currentActiveOrgId = session.session.activeOrganizationId;
  if (!currentActiveOrgId || currentActiveOrgId !== requestedOrgId) {
    try {
      await db.session.update({
        where: { id: session.session.id },
        data: { activeOrganizationId: requestedOrgId },
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

  // If this org is not accessible on current plan, redirect to upgrade
  if (!organization.hasAccess) {
    return redirect(`/upgrade/${organization.id}`);
  }

  // If onboarding is required and user isn't already on onboarding, redirect
  if (!organization.onboardingCompleted) {
    return redirect(`/onboarding/${organization.id}`);
  }

  const onboarding = await db.onboarding.findFirst({
    where: {
      organizationId: requestedOrgId,
    },
  });

  // Fetch organizations and feature flags for sidebar
  const { organizations } = await getOrganizations();

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
  if (session?.user?.id) {
    const flags = await getFeatureFlags(session.user.id);
    isQuestionnaireEnabled = flags['ai-vendor-questionnaire'] === true;
    isTrustNdaEnabled =
      flags['is-trust-nda-enabled'] === true || flags['is-trust-nda-enabled'] === 'true';
    isWebAutomationsEnabled =
      flags['is-web-automations-enabled'] === true ||
      flags['is-web-automations-enabled'] === 'true';
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
        hasAuditorRole={hasAuditorRole}
        isOnlyAuditor={isOnlyAuditor}
        permissions={permissions}
        user={user}
      >
        {children}
      </AppShellWrapper>
      <HotKeys />
    </TriggerTokenProvider>
  );
}
