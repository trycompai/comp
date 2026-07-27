import { CompanyOverviewCards } from './components/CompanyOverviewCards';
import { DocumentSettings } from './components/DocumentSettings';
import { DocumentsPageTabs } from './components/DocumentsPageTabs';
import { IsmsOverview } from './components/isms/IsmsOverview';

export default async function CompanyPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;

  // The ISO 27001 (ISMS) tab is framework-conditional and resolved inside
  // DocumentsPageTabs (it appears only when ISO 27001 is active for the org).
  return (
    <DocumentsPageTabs
      organizationId={orgId}
      ismsContent={<IsmsOverview organizationId={orgId} />}
      companyFormsContent={<CompanyOverviewCards organizationId={orgId} />}
      settingsContent={<DocumentSettings organizationId={orgId} />}
    />
  );
}
