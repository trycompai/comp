import PageWithBreadcrumb from '@/components/pages/PageWithBreadcrumb';
import { serverApi } from '@/lib/api-server';
import { auth } from '@/utils/auth';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { AdditionalDocumentsSection } from '../questionnaire/knowledge-base/additional-documents/components';
import { ContextSection } from '../questionnaire/knowledge-base/context/components';
import { ManualAnswersSection } from '../questionnaire/knowledge-base/manual-answers/components';
import { PublishedPoliciesSection } from '../questionnaire/knowledge-base/published-policies/components';
import { KnowledgeBaseHeader } from '../questionnaire/knowledge-base/components/KnowledgeBaseHeader';
import type {
  ContextEntry,
  KBDocument,
  ManualAnswer,
  PublishedPolicy,
} from '../questionnaire/components/types';

interface PolicyApiResponse {
  data: Array<PublishedPolicy & { status: string; isArchived: boolean }>;
}

interface ContextApiResponse {
  data: ContextEntry[];
}

export default async function KnowledgeBasePage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id || !session?.session?.activeOrganizationId) {
    return notFound();
  }

  const organizationId = session.session.activeOrganizationId;

  // Fetch all data in parallel via API
  const [policiesResult, contextResult, manualAnswersResult, kbDocumentsResult] =
    await Promise.all([
      serverApi.get<PolicyApiResponse>('/v1/policies'),
      serverApi.get<ContextApiResponse>('/v1/context'),
      serverApi.get<ManualAnswer[]>('/v1/knowledge-base/manual-answers'),
      serverApi.get<KBDocument[]>('/v1/knowledge-base/documents'),
    ]);

  const allPolicies = policiesResult.data?.data ?? [];
  const policies = allPolicies.filter(
    (p) => p.status === 'published' && !p.isArchived,
  );
  const contextEntries = contextResult.data?.data ?? [];
  const manualAnswers = Array.isArray(manualAnswersResult.data)
    ? manualAnswersResult.data
    : [];
  const documents = Array.isArray(kbDocumentsResult.data)
    ? kbDocumentsResult.data
    : [];

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
