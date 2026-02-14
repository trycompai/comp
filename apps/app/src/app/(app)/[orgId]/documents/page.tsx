import { PageHeader, PageLayout } from '@trycompai/design-system';
import { CompanyOverviewCards } from './components/CompanyOverviewCards';

export default async function CompanyPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;

  return (
    <PageLayout>
      <PageHeader title="Documents" />
      <CompanyOverviewCards organizationId={orgId} />
    </PageLayout>
  );
}
