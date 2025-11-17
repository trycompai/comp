import { getFeatureFlags } from '@/app/posthog';
import { AppOnboarding } from '@/components/app-onboarding';
import { auth } from '@/utils/auth';
import { db } from '@db';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { QuestionnaireParser } from './components/QuestionnaireParser';
import { QuestionnaireSidebar } from './components/QuestionnaireSidebar';

export default async function SecurityQuestionnairePage() {
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
      <div className="mx-auto max-w-[1200px] px-6 py-8">
        <AppOnboarding
          title={'Security Questionnaire'}
          description={
            "Automatically answer security questionnaires with the information we have about your company. Upload questionnaires from vendors and we'll extract the questions and provide answers based on your policies and organizational details."
          }
          cta={'Publish policies'}
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
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
        <div className="lg:col-span-2 flex flex-col gap-6 min-w-0">
          <div className="flex flex-col gap-2 lg:gap-3">
            <h1 className="text-xl lg:text-2xl font-semibold text-foreground">
              Security Questionnaire
            </h1>
            <p className="text-xs lg:text-sm text-muted-foreground leading-relaxed max-w-3xl">
              Automatically analyze and answer questionnaires using AI. Upload questionnaires from
              vendors, and our system will extract questions and generate answers based on your
              organization's policies and documentation.
            </p>
          </div>
          <QuestionnaireParser />
        </div>
        <div className="lg:col-span-1">
          <QuestionnaireSidebar />
        </div>
      </div>
    </div>
  );
}

const checkPublishedPolicies = cache(async (organizationId: string): Promise<boolean> => {
  const count = await db.policy.count({
    where: {
      organizationId,
      status: 'published',
      isArchived: false,
    },
  });

  return count > 0;
});
