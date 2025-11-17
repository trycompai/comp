import { getFeatureFlags } from '@/app/posthog';
import { AppOnboarding } from '@/components/app-onboarding';
import { CreatePolicySheet } from '@/components/sheets/create-policy-sheet';
import { auth } from '@/utils/auth';
import { db } from '@db';
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from '@comp/ui/breadcrumb';
import { cache } from 'react';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { QuestionnaireParser } from './components/QuestionnaireParser';

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
      <div className="flex flex-col gap-6 p-4 lg:p-6">

        <div className="py-4">
          <AppOnboarding
            title={'Security Questionnaire'}
            description={
              'Automatically analyze and answer questionnaires using AI. Upload questionnaires from vendors, and our system will extract questions and generate answers based on your organization\'s policies and documentation.'
            }
            cta={'Create policy'}
            imageSrcLight="/questionaire/tmp-questionaire-empty-state.png"
            imageSrcDark="/questionaire/tmp-questionaire-empty-state.png"
            imageAlt="Security Questionnaire"
            sheetName="create-policy-sheet"
            faqs={[
              {
                questionKey: 'What is a security questionnaire?',
                answerKey:
                  'A security questionnaire is a document used by vendors and partners to assess your organization\'s security practices and compliance posture.',
              },
              {
                questionKey: 'Why do I need published policies?',
                answerKey:
                  'Published policies are required for the AI to generate accurate answers. The system uses your organization\'s policies and documentation to answer questionnaire questions automatically.',
              },
              {
                questionKey: 'How does it work?',
                answerKey:
                  'Upload a questionnaire file, and our AI will extract questions and generate answers based on your published policies and context. You can review and edit answers before exporting.',
              },
            ]}
          />
          <CreatePolicySheet />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4 lg:p-6">
      <div className="flex items-center justify-between">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbPage>Questionnaire</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="flex flex-col gap-6 lg:gap-8">
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
