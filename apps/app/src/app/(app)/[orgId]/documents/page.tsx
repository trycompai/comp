import { CompanyOverviewCards } from './components/CompanyOverviewCards';
import { DocumentSettings } from './components/DocumentSettings';
import { DocumentsPageTabs } from './components/DocumentsPageTabs';

export default async function CompanyPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;

  return (
    <DocumentsPageTabs
      overviewContent={<CompanyOverviewCards organizationId={orgId} />}
      settingsContent={<DocumentSettings organizationId={orgId} />}
    />
  );
}
