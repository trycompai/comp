import { getFeatureFlags } from '@/app/posthog';
import { AppOnboarding } from '@/components/app-onboarding';
import PageWithBreadcrumb from '@/components/pages/PageWithBreadcrumb';
import { serverApi } from '@/lib/api-server';
import { auth } from '@/utils/auth';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { QuestionnaireParser } from '../components/QuestionnaireParser';

interface PolicyApiResponse {
  data: Array<{
    id: string;
    status: string;
    isArchived: boolean;
  }>;
}

export default async function NewQuestionnairePage() {
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

  const policiesResult = await serverApi.get<PolicyApiResponse>('/v1/policies');
  const policies = policiesResult.data?.data ?? [];
  const hasPublishedPolicies = policies.some(
    (p) => p.status === 'published' && !p.isArchived,
  );

  if (!hasPublishedPolicies) {
    return (
      <PageWithBreadcrumb
        breadcrumbs={[
          { label: 'Overview', href: `/${organizationId}/questionnaire` },
          { label: 'New Questionnaire', current: true },
        ]}
      >
        <AppOnboarding
          title={'Security Questionnaire'}
          description={
            "Automatically answer security questionnaires with the information we have about your company. Upload questionnaires from vendors and we'll extract the questions and provide answers based on your policies and organizational details."
          }
          ctaDisabled={true}
          cta={'Publish policies'}
          ctaTooltip="To use this feature you need to publish policies first"
          href={`/${organizationId}/policies`}
          imageSrcLight="/questionaire/tmp-questionaire-empty-state.png"
          imageSrcDark="/questionaire/tmp-questionaire-empty-state.png"
          imageAlt="Security Questionnaire"
          faqs={[
            {
              questionKey: 'What is a security questionnaire?',
              answerKey:
                "A security questionnaire is a document used by vendors and partners to assess your organization's security practices and compliance posture.",
            },
            {
              questionKey: 'Why do I need published policies?',
              answerKey:
                "Published policies are used to get accurate answers. The system uses your organization's policies and context to answer questionnaire questions automatically.",
            },
            {
              questionKey: 'How does it work?',
              answerKey:
                'Upload a questionnaire file, our AI will extract the questions and find answers based on your published policies and context. You can review and edit answers before exporting.',
            },
          ]}
        />
      </PageWithBreadcrumb>
    );
  }

  return (
    <PageWithBreadcrumb
      breadcrumbs={[
        { label: 'Security Questionnaire', href: `/${organizationId}/questionnaire` },
        { label: 'New Questionnaire', current: true },
      ]}
    >
      <QuestionnaireParser />
    </PageWithBreadcrumb>
  );
}
