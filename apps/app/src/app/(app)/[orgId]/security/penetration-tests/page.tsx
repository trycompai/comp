import { auth } from '@/utils/auth';
import { db } from '@db';
import { headers } from 'next/headers';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { PenetrationTestsPageClient } from './penetration-tests-page-client';

export default async function PenetrationTestsPage({
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

  const subscription = await db.pentestSubscription.findUnique({
    where: { organizationId: orgId },
  });

  const hasActiveSubscription = subscription?.status === 'active';

  return <PenetrationTestsPageClient orgId={orgId} hasActiveSubscription={hasActiveSubscription} />;
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Penetration Tests',
  };
}
