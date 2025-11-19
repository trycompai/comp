import { DeleteOrganization } from '@/components/forms/organization/delete-organization';
import { UpdateOrganizationAdvancedMode } from '@/components/forms/organization/update-organization-advanced-mode';
import { UpdateOrganizationName } from '@/components/forms/organization/update-organization-name';
import { UpdateOrganizationWebsite } from '@/components/forms/organization/update-organization-website';
import { db } from '@db';
import type { Metadata } from 'next';
import { cache } from 'react';

export default async function OrganizationSettings({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  const organization = await organizationDetails(orgId);

  return (
    <div className="space-y-4">
      <UpdateOrganizationName organizationName={organization?.name ?? ''} />
      <UpdateOrganizationWebsite organizationWebsite={organization?.website ?? ''} />
      <UpdateOrganizationAdvancedMode
        advancedModeEnabled={organization?.advancedModeEnabled ?? false}
      />
      <DeleteOrganization organizationId={organization?.id ?? ''} />
    </div>
  );
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Settings',
  };
}

const organizationDetails = cache(async (orgId: string) => {
  const organization = await db.organization.findUnique({
    where: { id: orgId },
    select: {
      name: true,
      id: true,
      website: true,
      advancedModeEnabled: true,
    },
  });

  return organization;
});
