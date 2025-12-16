import { getFeatureFlags } from '@/app/posthog';
import { APP_AWS_ORG_ASSETS_BUCKET, s3Client } from '@/app/s3';
import { getOrganizations } from '@/data/getOrganizations';
import { auth } from '@/utils/auth';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from '@comp/ui/sidebar';
import { db, type Organization, Role } from '@db';
import { headers } from 'next/headers';
import { MainMenu } from './main-menu';
import { OrganizationSwitcher } from './organization-switcher';
import { SidebarCollapseButton } from './sidebar-collapse-button';
import { SidebarLogo } from './sidebar-logo';

function parseRolesString(rolesStr: string | null | undefined): Role[] {
  if (!rolesStr) return [];
  return rolesStr
    .split(',')
    .map((r) => r.trim())
    .filter((r) => r in Role) as Role[];
}

export async function AppSidebar({ organization }: { organization?: Organization | null }) {
  const { organizations } = await getOrganizations();

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
      isOnlyAuditor = hasAuditorRole && roles.length === 1;
    }
  }

  return (
    <Sidebar collapsible="icon" variant="sidebar" side="left">
      <SidebarHeader>
        <SidebarLogo />
        <div className="mt-2">
          <OrganizationSwitcher
            organizations={organizations}
            organization={organization ?? null}
            logoUrls={logoUrls}
          />
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2">
        <MainMenu
          organizationId={organization?.id ?? ''}
          organization={organization ?? null}
          isQuestionnaireEnabled={isQuestionnaireEnabled}
          isTrustNdaEnabled={isTrustNdaEnabled}
          hasAuditorRole={hasAuditorRole}
          isOnlyAuditor={isOnlyAuditor}
        />
      </SidebarContent>

      <SidebarFooter>
        <SidebarCollapseButton />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
