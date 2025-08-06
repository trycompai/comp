import { DeleteOrganization } from '@/components/forms/organization/delete-organization';
import { UpdateOrganizationName } from '@/components/forms/organization/update-organization-name';
import { UpdateOrganizationWebsite } from '@/components/forms/organization/update-organization-website';
import { auth } from '@/utils/auth';
import { db } from '@db';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { cache } from 'react';
import { getGT } from 'gt-next/server';

export default async function OrganizationSettings() {
  const organization = await organizationDetails();

  return (
    <div className="space-y-4">
      <UpdateOrganizationName organizationName={organization?.name ?? ''} />
      <UpdateOrganizationWebsite organizationWebsite={organization?.website ?? ''} />
      <DeleteOrganization organizationId={organization?.id ?? ''} />
    </div>
  );
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getGT();
  return {
    title: t('Settings'),
  };
}

const organizationDetails = cache(async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.session.activeOrganizationId) {
    return null;
  }

  const organization = await db.organization.findUnique({
    where: { id: session?.session.activeOrganizationId },
    select: {
      name: true,
      id: true,
      website: true,
    },
  });

  return organization;
});
