import { getFeatureFlags } from '@/app/posthog';
import { serverApi } from '@/lib/api-server';
import { auth } from '@/utils/auth';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { QuestionnaireTabs } from './components/QuestionnaireTabs';

interface PolicyApiResponse {
  data: Array<{
    id: string;
    name: string;
    description: string | null;
    status: string;
    isArchived: boolean;
    createdAt: string;
    updatedAt: string;
  }>;
}

interface QuestionnaireApiResponse {
  data: Array<{
    id: string;
    filename: string;
    fileType: string;
    status: string;
    totalQuestions: number;
    answeredQuestions: number;
    source: string | null;
    createdAt: string;
    updatedAt: string;
    questions: Array<{
      id: string;
      question: string;
      answer: string | null;
      status: string;
      questionIndex: number;
    }>;
  }>;
}

interface ContextApiResponse {
  data: Array<{
    id: string;
    question: string;
    answer: string | null;
    tags: string[];
    createdAt: string;
    updatedAt: string;
  }>;
}

interface ManualAnswerApiResponse {
  id: string;
  question: string;
  answer: string;
  tags: string[];
  sourceQuestionnaireId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface KBDocumentApiResponse {
  id: string;
  name: string;
  description: string | null;
  s3Key: string;
  fileType: string;
  fileSize: number;
  processingStatus: string;
  createdAt: string;
  updatedAt: string;
}

export default async function SecurityQuestionnairePage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id || !session?.session?.activeOrganizationId) {
    return notFound();
  }

  const flags = await getFeatureFlags(session.user.id);
  const isFeatureEnabled = flags['ai-vendor-questionnaire'] === true;

  if (!isFeatureEnabled) {
    return notFound();
  }

  const organizationId = session.session.activeOrganizationId;

  // Fetch all data in parallel via API
  const [
    policiesResult,
    questionnairesResult,
    contextResult,
    manualAnswersResult,
    kbDocumentsResult,
  ] = await Promise.all([
    serverApi.get<PolicyApiResponse>('/v1/policies'),
    serverApi.get<QuestionnaireApiResponse>('/v1/questionnaire'),
    serverApi.get<ContextApiResponse>('/v1/context'),
    serverApi.get<ManualAnswerApiResponse[]>('/v1/knowledge-base/manual-answers'),
    serverApi.get<KBDocumentApiResponse[]>('/v1/knowledge-base/documents'),
  ]);

  // Derive hasPublishedPolicies
  const allPolicies = policiesResult.data?.data ?? [];
  const publishedPolicies = allPolicies.filter(
    (p) => p.status === 'published' && !p.isArchived,
  );
  const hasPublishedPolicies = publishedPolicies.length > 0;

  // Questionnaires list
  const questionnaires = questionnairesResult.data?.data ?? [];

  // Context data
  const contextEntries = contextResult.data?.data ?? [];

  // Knowledge base data — these endpoints return arrays directly (no data wrapper)
  const manualAnswers = Array.isArray(manualAnswersResult.data)
    ? manualAnswersResult.data
    : [];
  const documents = Array.isArray(kbDocumentsResult.data)
    ? kbDocumentsResult.data
    : [];

  return (
    <QuestionnaireTabs
      organizationId={organizationId}
      questionnaires={questionnaires}
      hasPublishedPolicies={hasPublishedPolicies}
      policies={publishedPolicies}
      contextEntries={contextEntries}
      manualAnswers={manualAnswers}
      documents={documents}
    />
  );
}
