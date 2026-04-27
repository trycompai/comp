import { auth } from '@/utils/auth';
import { db } from '@db/server';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { NewPenetrationTestPageClient } from './new-penetration-test-page-client';

interface NewPageProps {
  params: Promise<{ orgId: string }>;
}

export default async function NewPenetrationTestPage({ params }: NewPageProps) {
  const { orgId } = await params;
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

  return <NewPenetrationTestPageClient orgId={orgId} />;
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'New Penetration Test',
  };
}
