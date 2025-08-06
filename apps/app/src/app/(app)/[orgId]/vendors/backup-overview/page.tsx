import { VendorOverview } from '@/app/(app)/[orgId]/vendors/backup-overview/components/charts/vendor-overview';
import { getServersideSession } from '@/lib/get-session';
import { getGT } from 'gt-next/server';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function VendorManagement() {
  const {
    session: { activeOrganizationId },
  } = await getServersideSession({
    headers: await headers(),
  });

  if (!activeOrganizationId) {
    redirect('/');
  }

  return (
    <div className="space-y-4 sm:space-y-8">
      <VendorOverview organizationId={activeOrganizationId} />
    </div>
  );
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getGT();
  
  return {
    title: t('Vendors'),
  };
}
