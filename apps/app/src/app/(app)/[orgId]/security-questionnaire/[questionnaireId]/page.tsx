import { auth } from '@/utils/auth';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import PageCore from '@/components/pages/PageCore.tsx';
import { QuestionnaireResults } from '../components/QuestionnaireResults';
import { useQuestionnaireDetail } from '../hooks/useQuestionnaireDetail';
import { getQuestionnaireById } from './data/queries';
import { QuestionnaireDetailClient } from './components/QuestionnaireDetailClient';
import { QuestionnaireBreadcrumb } from './components/QuestionnaireBreadcrumb';

export default async function QuestionnaireDetailPage({
  params,
}: {
  params: Promise<{ questionnaireId: string; orgId: string }>;
}) {
  const { questionnaireId, orgId } = await params;

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id || !session?.session?.activeOrganizationId) {
    return notFound();
  }

  const organizationId = session.session.activeOrganizationId;

  if (organizationId !== orgId) {
    return notFound();
  }

  const questionnaire = await getQuestionnaireById(questionnaireId, organizationId);

  if (!questionnaire) {
    return notFound();
  }

  return (
    <PageCore className="mt-10">
      <QuestionnaireBreadcrumb filename={questionnaire.filename} organizationId={organizationId} />
      <QuestionnaireDetailClient
        questionnaireId={questionnaireId}
        organizationId={organizationId}
        initialQuestions={questionnaire.questions}
        filename={questionnaire.filename}
      />
    </PageCore>
  );
}

