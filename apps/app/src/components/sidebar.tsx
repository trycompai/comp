import { getFeatureFlags } from '@/app/posthog';
import { APP_AWS_ORG_ASSETS_BUCKET, s3Client } from '@/app/s3';
import { getOrganizations } from '@/data/getOrganizations';
import { auth } from '@/utils/auth';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { cn } from '@comp/ui/cn';
import { db, type Organization, Role } from '@db';
import { cookies, headers } from 'next/headers';
import { MainMenu } from './main-menu';
import { OrganizationSwitcher } from './organization-switcher';
import { SidebarCollapseButton } from './sidebar-collapse-button';
import { SidebarLogo } from './sidebar-logo';

// Helper to safely parse comma-separated roles string
function parseRolesString(rolesStr: string | null | undefined): Role[] {
  if (!rolesStr) return [];
  return rolesStr
    .split(',')
    .map((r) => r.trim())
    .filter((r) => r in Role) as Role[];
}

export async function Sidebar({
  organization,
  collapsed = false,
}: {
  organization: Organization | null;
  collapsed?: boolean;
}) {
  const cookieStore = await cookies();
  const isCollapsed = collapsed || cookieStore.get('sidebar-collapsed')?.value === 'true';
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
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  let isQuestionnaireEnabled = false;
  let isTrustNdaEnabled = false;
  if (session?.user?.id) {
    const flags = await getFeatureFlags(session.user.id);
    isQuestionnaireEnabled = flags['ai-vendor-questionnaire'] === true;
    isTrustNdaEnabled =
      flags['is-trust-nda-enabled'] === true || flags['is-trust-nda-enabled'] === 'true';
  }

  let hasAuditorRole = false;
  let isOnlyAuditor = false;
  if (session?.user?.id && organization?.id) {
    const member = await db.member.findFirst({
      where: {
        userId: session.user.id,
        organizationId: organization.id,
        deactivated: false,
      },
    });
    if (member?.role) {
      const roles = parseRolesString(member.role);
      hasAuditorRole = roles.includes(Role.auditor);
      // Only hide tabs if auditor is their ONLY role
      // If they have multiple roles (e.g., "owner, auditor" or "admin, auditor"), show tabs
      isOnlyAuditor = hasAuditorRole && roles.length === 1;
    }
  }

  return (
    <div className="bg-card flex h-full flex-col gap-0 overflow-x-clip">
      <div className="flex flex-col gap-2 p-4">
        <div className={cn('flex items-center justify-start', isCollapsed && 'justify-center')}>
          <SidebarLogo isCollapsed={isCollapsed} />
        </div>
        <div className="mt-2 flex flex-col gap-2">
          <OrganizationSwitcher
            organizations={organizations}
            organization={organization}
            isCollapsed={isCollapsed}
            logoUrls={logoUrls}
          />
          <MainMenu
            organizationId={organization?.id ?? ''}
            organization={organization}
            isCollapsed={isCollapsed}
            isQuestionnaireEnabled={isQuestionnaireEnabled}
            isTrustNdaEnabled={isTrustNdaEnabled}
            hasAuditorRole={hasAuditorRole}
            isOnlyAuditor={isOnlyAuditor}
          />
        </div>
      </div>
      <div className="flex-1" />

      <div className="flex justify-center py-2">
        <SidebarCollapseButton isCollapsed={isCollapsed} />
      </div>
    </div>
  );
}
