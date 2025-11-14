import { getFeatureFlags } from '@/app/posthog';
import { auth } from '@/utils/auth';
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from '@comp/ui/breadcrumb';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { QuestionnaireParser } from './components/QuestionnaireParser';

export default async function SecurityQuestionnairePage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    return notFound();
  }

  // Check feature flag on server
  const flags = await getFeatureFlags(session.user.id);
  const isFeatureEnabled = flags['ai-vendor-questionnaire'] === true;

  if (!isFeatureEnabled) {
    return notFound();
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
