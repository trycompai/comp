import { DeleteOrganization } from '@/components/forms/organization/delete-organization';
import { TransferOwnership } from '@/components/forms/organization/transfer-ownership';
import { UpdateOrganizationAdvancedMode } from '@/components/forms/organization/update-organization-advanced-mode';

import { UpdateOrganizationLogo } from '@/components/forms/organization/update-organization-logo';
import { UpdateOrganizationName } from '@/components/forms/organization/update-organization-name';
import { UpdateOrganizationWebsite } from '@/components/forms/organization/update-organization-website';
import { serverApi } from '@/lib/api-server';
import { db } from '@db';
import type { Metadata } from 'next';

export default async function OrganizationSettings({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;

  // Fetch org basic info directly from DB (accessible to any member),
  // and try the API for ownership data (requires organization:read).
  const [orgBasic, res] = await Promise.all([
    db.organization.findUnique({
      where: { id: orgId },
      select: { id: true, name: true, website: true, advancedModeEnabled: true, logo: true },
    }),
    serverApi.get<{
      id: string;
      name: string;
      website: string | null;
      advancedModeEnabled: boolean;
      logo: string | null;
      logoUrl: string | null;
      isOwner: boolean;
      eligibleMembers: Array<{
        id: string;
        user: { name: string | null; email: string };
      }>;
    }>('/v1/organization?includeOwnership=true'),
  ]);

  // Use API data when available (has logoUrl, ownership info), fall back to DB for basic fields
  const organization = res.data;
  const orgName = organization?.name ?? orgBasic?.name ?? '';
  const orgWebsite = organization?.website ?? orgBasic?.website ?? '';
  const advancedMode = organization?.advancedModeEnabled ?? orgBasic?.advancedModeEnabled ?? false;
  const logoUrl = organization?.logoUrl ?? null;

  return (
    <div className="flex flex-col gap-4">
      <UpdateOrganizationName organizationName={orgName} />
      <UpdateOrganizationWebsite organizationWebsite={orgWebsite} />
      <UpdateOrganizationLogo currentLogoUrl={logoUrl} />
      <UpdateOrganizationAdvancedMode advancedModeEnabled={advancedMode} />
      <TransferOwnership
        members={organization?.eligibleMembers ?? []}
        isOwner={organization?.isOwner ?? false}
      />
      <DeleteOrganization
        organizationId={orgBasic?.id ?? orgId}
        isOwner={organization?.isOwner ?? false}
      />
    </div>
  );
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Settings',
  };
}
