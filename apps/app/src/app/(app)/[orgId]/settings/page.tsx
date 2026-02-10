import { DeleteOrganization } from '@/components/forms/organization/delete-organization';
import { TransferOwnership } from '@/components/forms/organization/transfer-ownership';
import { UpdateOrganizationAdvancedMode } from '@/components/forms/organization/update-organization-advanced-mode';
import { UpdateOrganizationLogo } from '@/components/forms/organization/update-organization-logo';
import { UpdateOrganizationName } from '@/components/forms/organization/update-organization-name';
import { UpdateOrganizationWebsite } from '@/components/forms/organization/update-organization-website';
import { serverApi } from '@/lib/api-server';
import type { Metadata } from 'next';

export default async function OrganizationSettings({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;

  const res = await serverApi.get<{
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
  }>('/v1/organization?includeOwnership=true');

  const organization = res.data;

  return (
    <div className="flex flex-col gap-4">
      <UpdateOrganizationName organizationName={organization?.name ?? ''} />
      <UpdateOrganizationWebsite
        organizationWebsite={organization?.website ?? ''}
      />
      <UpdateOrganizationLogo currentLogoUrl={organization?.logoUrl ?? null} />
      <UpdateOrganizationAdvancedMode
        advancedModeEnabled={organization?.advancedModeEnabled ?? false}
      />
      <TransferOwnership
        members={organization?.eligibleMembers ?? []}
        isOwner={organization?.isOwner ?? false}
      />
      <DeleteOrganization
        organizationId={organization?.id ?? ''}
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
