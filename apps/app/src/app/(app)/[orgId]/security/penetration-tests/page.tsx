import { auth } from '@/utils/auth';
import { db } from '@db';
import { headers } from 'next/headers';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { getPentestPricing } from './actions/billing';
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

  let usage: {
    includedRuns: number;
    usedRuns: number;
    remainingRuns: number;
    currentPeriodEnd: string;
  } | null = null;

  if (hasActiveSubscription && subscription) {
    const usedRuns = await db.securityPenetrationTestRun.count({
      where: {
        organizationId: orgId,
        createdAt: {
          gte: subscription.currentPeriodStart,
          lt: subscription.currentPeriodEnd,
        },
      },
    });

    const includedRuns = subscription.includedRunsPerPeriod;
    usage = {
      includedRuns,
      usedRuns,
      remainingRuns: Math.max(0, includedRuns - usedRuns),
      currentPeriodEnd: subscription.currentPeriodEnd.toISOString(),
    };
  }

  const pricing = await getPentestPricing();

  return <PenetrationTestsPageClient orgId={orgId} hasActiveSubscription={hasActiveSubscription} usage={usage} pricing={pricing} />;
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Penetration Tests',
  };
}
