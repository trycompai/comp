import PageWithBreadcrumb from '@/components/pages/PageWithBreadcrumb';
import { auth } from '@/utils/auth';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { AdditionalDocumentsSection } from '../questionnaire/knowledge-base/additional-documents/components';
import { ContextSection } from '../questionnaire/knowledge-base/context/components';
import { ManualAnswersSection } from '../questionnaire/knowledge-base/manual-answers/components';
import { PublishedPoliciesSection } from '../questionnaire/knowledge-base/published-policies/components';
import { KnowledgeBaseHeader } from '../questionnaire/knowledge-base/components/KnowledgeBaseHeader';
import {
  getContextEntries,
  getKnowledgeBaseDocuments,
  getManualAnswers,
  getPublishedPolicies,
} from '../questionnaire/knowledge-base/data/queries';

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
      className="px-6"
    >
      <KnowledgeBaseHeader organizationId={organizationId} />

      <div className="flex flex-col gap-6">
        {/* Published Policies and Context Sections - Side by Side */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
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
