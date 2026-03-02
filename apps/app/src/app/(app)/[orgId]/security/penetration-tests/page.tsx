import { auth } from '@/utils/auth';
import { db } from '@db';
import { headers } from 'next/headers';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { VulnerabilityReportsPageClient } from './vulnerability-reports-page-client';

export default async function VulnerabilityReportsPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user.id) {
    redirect('/auth');
  }

  const member = await db.member.findFirst({
    where: {
      organizationId: orgId,
      userId: session.user.id,
      deactivated: false,
    },
  });

  if (!member) {
    redirect('/');
  }

  return <VulnerabilityReportsPageClient orgId={orgId} />;
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Penetration Tests',
  };
}
