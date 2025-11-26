import { getFeatureFlags } from '@/app/posthog';
import { AppOnboarding } from '@/components/app-onboarding';
import PageWithBreadcrumb from '@/components/pages/PageWithBreadcrumb';
import { auth } from '@/utils/auth';
import { db } from '@db';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { QuestionnaireParser } from '../components/QuestionnaireParser';

export default async function NewQuestionnairePage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id || !session?.session?.activeOrganizationId) {
    return notFound();
  }

  // Check feature flag on server
  const flags = await getFeatureFlags(session.user.id);
  const isFeatureEnabled = flags['ai-vendor-questionnaire'] === true;

  if (!isFeatureEnabled) {
    return notFound();
  }

  const organizationId = session.session.activeOrganizationId;

  // Check if organization has published policies
  const hasPublishedPolicies = await checkPublishedPolicies(organizationId);

  // Show onboarding if no published policies exist
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
          href={`/${organizationId}/policies/all`}
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

const checkPublishedPolicies = async (organizationId: string): Promise<boolean> => {
  const count = await db.policy.count({
    where: {
      organizationId,
      status: 'published',
      isArchived: false,
    },
  });

  return count > 0;
};

