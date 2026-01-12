import { db } from '@db';
import type { Metadata } from 'next';
import { PoliciesTableDS } from './components/PoliciesTableDS';
import { PolicyTailoringProvider } from './components/policy-tailoring-context';

interface PolicyTableProps {
  params: Promise<{ orgId: string }>;
}

export default async function PoliciesPage({ params }: PolicyTableProps) {
  const { orgId } = await params;

  const policies = await db.policy.findMany({
    where: { organizationId: orgId, isArchived: false },
    orderBy: { updatedAt: 'desc' },
  });

  return (
    <PolicyTailoringProvider statuses={{}}>
      <PoliciesTableDS policies={policies} />
    </PolicyTailoringProvider>
  );
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Policies',
  };
}
