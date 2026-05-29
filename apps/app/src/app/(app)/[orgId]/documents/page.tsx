import { headers } from 'next/headers';
import { getFeatureFlags } from '@/app/posthog';
import { auth } from '@/utils/auth';
import { CompanyOverviewCards } from './components/CompanyOverviewCards';
import { DocumentSettings } from './components/DocumentSettings';
import { DocumentsPageTabs } from './components/DocumentsPageTabs';
import { IsmsOverview } from './components/isms/IsmsOverview';

/**
 * Resolve the ISMS feature flag from the same source as the rail/sidebar flags in
 * `[orgId]/layout.tsx` (PostHog). Defaults to false so the ISO 27001 (ISMS) tab
 * stays hidden in production until the full 6-document pack ships.
 */
async function resolveIsmsEnabled(organizationId: string): Promise<boolean> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) return false;

  const flags = await getFeatureFlags(session.user.id, {
    groups: { organization: organizationId },
  });
  return flags['is-isms-enabled'] === true || flags['is-isms-enabled'] === 'true';
}

export default async function CompanyPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  const isIsmsEnabled = await resolveIsmsEnabled(orgId);

  return (
    <DocumentsPageTabs
      isIsmsEnabled={isIsmsEnabled}
      ismsContent={<IsmsOverview organizationId={orgId} />}
      companyFormsContent={
        <CompanyOverviewCards organizationId={orgId} isIsmsEnabled={isIsmsEnabled} />
      }
      settingsContent={<DocumentSettings organizationId={orgId} />}
    />
  );
}
