import PageWithBreadcrumb from '@/components/pages/PageWithBreadcrumb';
import { serverApi } from '@/lib/api-server';
import { notFound } from 'next/navigation';
import { QuestionnaireDetailClient } from './components/QuestionnaireDetailClient';

interface QuestionnaireApiResponse {
  id: string;
  filename: string;
  questions: Array<{
    id: string;
    question: string;
    answer: string | null;
    status: 'untouched' | 'generated' | 'manual';
    questionIndex: number;
    sources: unknown;
  }>;
}

export default async function QuestionnaireDetailPage({
  params,
}: {
  params: Promise<{ questionnaireId: string; orgId: string }>;
}) {
  const { questionnaireId, orgId } = await params;

  // GET /v1/questionnaire/:id returns questionnaire fields flat (no data wrapper)
  const result = await serverApi.get<QuestionnaireApiResponse>(
    `/v1/questionnaire/${questionnaireId}`,
  );

  const questionnaire = result.data;

  if (!questionnaire) {
    return notFound();
  }

  return (
    <PageWithBreadcrumb
      breadcrumbs={[
        { label: 'Overview', href: `/${orgId}/questionnaire` },
        { label: questionnaire.filename, current: true },
      ]}
    >
      <QuestionnaireDetailClient
        questionnaireId={questionnaireId}
        organizationId={orgId}
        initialQuestions={questionnaire.questions}
        filename={questionnaire.filename}
      />
    </PageWithBreadcrumb>
  );
}
