import { auth } from '@/utils/auth';
import { db } from '@db/server';
import { PageHeader, PageLayout } from '@trycompai/design-system';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { PenetrationTestPageClient } from './penetration-test-page-client';

interface ReportPageProps {
  params: Promise<{
    orgId: string;
    reportId: string;
  }>;
}

export default async function PenetrationTestPage({ params }: ReportPageProps) {
  const { orgId, reportId } = await params;
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user.id) {
    redirect('/auth');
  }

  const member = await db.member.findFirst({
    where: {
      userId: session.user.id,
      organizationId: orgId,
      deactivated: false,
    },
  });

  if (!member) {
    redirect('/');
  }

  return (
    <PageLayout>
      <PageHeader title="Penetration Test">Review details for this report generation.</PageHeader>
      <PenetrationTestPageClient orgId={orgId} reportId={reportId} />
    </PageLayout>
  );
}

export async function generateMetadata({ params }: ReportPageProps): Promise<Metadata> {
  const { reportId } = await params;
  return {
    title: `Penetration Test ${reportId}`,
  };
}
