import PageWithBreadcrumb from '@/components/pages/PageWithBreadcrumb';
import { auth } from '@/utils/auth';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { AdditionalDocumentsSection } from './additional-documents/components';
import { ContextSection } from './context/components';
import { ManualAnswersSection } from './manual-answers/components';
import { PublishedPoliciesSection } from './published-policies/components';
import { KnowledgeBaseHeader } from './components/KnowledgeBaseHeader';
import {
  getContextEntries,
  getKnowledgeBaseDocuments,
  getManualAnswers,
  getPublishedPolicies,
} from './data/queries';

export default async function KnowledgeBasePage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id || !session?.session?.activeOrganizationId) {
    return notFound();
  }

  const organizationId = session.session.activeOrganizationId;

  // Fetch all data in parallel
  const [policies, contextEntries, manualAnswers, documents] = await Promise.all([
    getPublishedPolicies(organizationId),
    getContextEntries(organizationId),
    getManualAnswers(organizationId),
    getKnowledgeBaseDocuments(organizationId),
  ]);

  return (
    <PageWithBreadcrumb
      breadcrumbs={[
        { label: 'Overview', current: true },
      ]}
    >
      <KnowledgeBaseHeader organizationId={organizationId} />

      <div className="flex flex-col gap-6">
        {/* Published Policies and Context Sections - Side by Side */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 items-stretch">
          <PublishedPoliciesSection policies={policies} />
          <ContextSection contextEntries={contextEntries} />
        </div>

        {/* Manual Answers Section */}
        <ManualAnswersSection manualAnswers={manualAnswers} />

        {/* Additional Documents Section */}
        <AdditionalDocumentsSection
          organizationId={organizationId}
          documents={documents}
        />
      </div>
    </PageWithBreadcrumb>
  );
}
