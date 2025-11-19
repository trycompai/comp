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
    <div className="mx-auto w-full max-w-[1200px] px-6 py-8">
      <KnowledgeBaseHeader organizationId={organizationId} />

      <div className="flex flex-col gap-6">
        {/* Published Policies Section */}
        <PublishedPoliciesSection policies={policies} />

        {/* Context Section */}
        <ContextSection contextEntries={contextEntries} />

        {/* Manual Answers Section */}
        <ManualAnswersSection manualAnswers={manualAnswers} />

        {/* Additional Documents Section */}
        <AdditionalDocumentsSection
          organizationId={organizationId}
          documents={documents}
        />
      </div>
    </div>
  );
}
