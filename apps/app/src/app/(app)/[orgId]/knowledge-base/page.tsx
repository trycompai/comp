import { auth } from '@/utils/auth';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { AdditionalDocumentsSection } from './additional-documents/components';
import { ContextSection } from './context/components';
import { ManualAnswersSection } from './manual-answers/components';
import { PublishedPoliciesSection } from './published-policies/components';
import { BackButton } from './components/BackButton';
import {
  getContextEntries,
  getKnowledgeBaseDocuments,
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
  const [policies, contextEntries, documents] = await Promise.all([
    getPublishedPolicies(organizationId),
    getContextEntries(organizationId),
    getKnowledgeBaseDocuments(organizationId),
  ]);

  return (
    <div className="mx-auto w-full max-w-[1200px] px-6 py-8">
      <BackButton />
      <div className="mb-8 flex flex-col gap-2">
        <h1 className="text-xl lg:text-2xl font-semibold text-foreground">Knowledge Base</h1>
        <p className="text-xs lg:text-sm text-muted-foreground leading-relaxed max-w-3xl">
          Manage your organization's knowledge base including published policies, context entries,
          manual answers, and additional documents.
        </p>
      </div>

      <div className="flex flex-col gap-6">
        {/* Published Policies Section */}
        <PublishedPoliciesSection policies={policies} />

        {/* Context Section */}
        <ContextSection contextEntries={contextEntries} />

        {/* Manual Answers Section */}
        <ManualAnswersSection />

        {/* Additional Documents Section */}
        <AdditionalDocumentsSection
          organizationId={organizationId}
          documents={documents}
        />
      </div>
    </div>
  );
}
