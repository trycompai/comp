import PageWithBreadcrumb from '@/components/pages/PageWithBreadcrumb';
import { auth } from '@/utils/auth';
import { headers } from 'next/headers';
import { FeatureFlagWrapper } from './components/FeatureFlagWrapper';

export default async function SecurityQuestionnairePage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const userEmail = session?.user?.email ?? null;

  return (
    <div className="mt-10">
    <PageWithBreadcrumb
      breadcrumbs={[
        { label: 'Questionnaire', current: true },
      ]}
    >
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Automatically parse and answer questionnaires using AI. Upload questionnaires from vendors, 
            and our system will extract questions and generate answers based on your organization's policies and documentation.
          </p>
        </div>
        <FeatureFlagWrapper userEmail={userEmail} />
      </div>
    </PageWithBreadcrumb>
    </div>
  );
}

