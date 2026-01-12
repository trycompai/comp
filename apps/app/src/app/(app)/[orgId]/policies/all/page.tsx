import { db } from '@db';
import { PageHeader, PageLayout, Stack } from '@trycompai/design-system';
import type { Metadata } from 'next';
import { PolicyTabs } from '../components/PolicyTabs';
import { PolicyTailoringProvider } from './components/policy-tailoring-context';
import { PolicyFilters } from './components/PolicyFilters';
import { PolicyPageActions } from './components/PolicyPageActions';

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
    <PageLayout container={false} padding="none">
      <Stack gap="md">
        <PageHeader title="Policies" actions={<PolicyPageActions policies={policies} />} />
        <PolicyTabs />
        <PolicyTailoringProvider statuses={{}}>
          <PolicyFilters policies={policies} />
        </PolicyTailoringProvider>
      </Stack>
    </PageLayout>
  );
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Policies',
  };
}
