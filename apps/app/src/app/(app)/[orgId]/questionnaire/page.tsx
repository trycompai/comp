import { getFeatureFlags } from '@/app/posthog';
import { serverApi } from '@/lib/api-server';
import { auth } from '@/utils/auth';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { QuestionnaireTabs } from './components/QuestionnaireTabs';

const ISO27001_NAMES = ['ISO 27001', 'iso27001', 'ISO27001'];

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

interface FrameworkApiResponse {
  data: Array<{
    id: string;
    frameworkId: string;
    framework: {
      id: string;
      name: string;
      description: string | null;
      visible: boolean;
    };
  }>;
}

interface PeopleApiResponse {
  data: Array<{
    id: string;
    role: string;
    userId: string;
    deactivated: boolean;
    user: {
      id: string;
      name: string | null;
      email: string;
      image: string | null;
    };
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

export default async function SecurityQuestionnairePage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;

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
    frameworksResult,
    peopleResult,
    contextResult,
    manualAnswersResult,
    kbDocumentsResult,
  ] = await Promise.all([
    serverApi.get<PolicyApiResponse>('/v1/policies'),
    serverApi.get<QuestionnaireApiResponse>('/v1/questionnaire'),
    serverApi.get<FrameworkApiResponse>('/v1/frameworks'),
    serverApi.get<PeopleApiResponse>('/v1/people'),
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

  // Check ISO 27001 framework
  const frameworks = frameworksResult.data?.data ?? [];
  const isoFrameworkInstance = frameworks.find((fi) => {
    return fi.framework?.name && ISO27001_NAMES.includes(fi.framework.name);
  });

  const hasISO27001 = !!isoFrameworkInstance;
  const showSOATab = hasISO27001;

  // People data
  const people = peopleResult.data?.data ?? [];

  // Context data
  const contextEntries = contextResult.data?.data ?? [];

  // Knowledge base data — these endpoints return arrays directly (no data wrapper)
  const manualAnswers = Array.isArray(manualAnswersResult.data)
    ? manualAnswersResult.data
    : [];
  const documents = Array.isArray(kbDocumentsResult.data)
    ? kbDocumentsResult.data
    : [];

  // Build SOA data if needed
  let soaData = null;
  let soaError: string | null = null;

  if (showSOATab && isoFrameworkInstance) {
    try {
      const { frameworkId, framework } = isoFrameworkInstance;

      const setupResult = await serverApi.post<{
        success: boolean;
        error?: string;
        configuration: Record<string, unknown> | null;
        document: Record<string, unknown> | null;
      }>('/v1/soa/ensure-setup', { frameworkId, organizationId });

      const configuration = setupResult.data?.configuration;
      const document = setupResult.data?.document;

      if (configuration && document) {
        // Find approver from people list
        let approver = null;
        const approverId = document.approverId as string | undefined;
        if (approverId) {
          approver =
            people.find((p) => p.id === approverId) ?? null;
        }

        // Find current member
        const currentMember =
          people.find(
            (p) => p.userId === session.user.id && !p.deactivated,
          ) ?? null;

        const canApprove = currentMember
          ? currentMember.role.includes('owner') ||
            currentMember.role.includes('admin')
          : false;

        const isPendingApproval = document.status === 'needs_review';
        const canCurrentUserApprove =
          isPendingApproval && approverId === currentMember?.id;

        // Filter owner/admin members
        const ownerAdminMembers = people
          .filter(
            (p) =>
              !p.deactivated &&
              (p.role.includes('owner') || p.role.includes('admin')),
          )
          .sort((a, b) =>
            (a.user?.name ?? '').localeCompare(b.user?.name ?? ''),
          );

        // Check if fully remote from context
        let isFullyRemote = false;
        const teamWorkContext = contextEntries.find((c) =>
          c.question?.toLowerCase().includes('how does your team work'),
        );
        if (teamWorkContext?.answer) {
          const answerLower = teamWorkContext.answer.toLowerCase();
          isFullyRemote =
            answerLower.includes('fully remote') ||
            answerLower.includes('fully-remote');
        }

        soaData = {
          framework,
          configuration,
          document,
          isFullyRemote,
          canApprove,
          approver: approver ? { ...approver, user: approver.user } : null,
          isPendingApproval,
          canCurrentUserApprove,
          currentMemberId: currentMember?.id || null,
          ownerAdminMembers,
        };
      }
    } catch (error) {
      console.error('Failed to setup SOA:', error);
      soaError = 'Failed to setup SOA. Please try again later.';
    }
  } else if (showSOATab && !isoFrameworkInstance) {
    soaError =
      'ISO 27001 framework not found. Please add ISO 27001 framework to your organization to get started.';
  }

  return (
    <QuestionnaireTabs
      organizationId={organizationId}
      questionnaires={questionnaires}
      hasPublishedPolicies={hasPublishedPolicies}
      showSOATab={showSOATab}
      soaData={soaData as Parameters<typeof QuestionnaireTabs>[0]['soaData']}
      soaError={soaError}
      policies={publishedPolicies}
      contextEntries={contextEntries}
      manualAnswers={manualAnswers}
      documents={documents}
    />
  );
}
