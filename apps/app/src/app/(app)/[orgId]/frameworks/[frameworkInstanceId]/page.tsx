import { serverApi } from '@/lib/api-server';
import { redirect } from 'next/navigation';
import PageWithBreadcrumb from '../../../../../components/pages/PageWithBreadcrumb';
import { FrameworkOverview } from './components/FrameworkOverview';
import { FrameworkRequirements } from './components/FrameworkRequirements';

interface PageProps {
  params: Promise<{
    orgId: string;
    frameworkInstanceId: string;
  }>;
}

export default async function FrameworkPage({ params }: PageProps) {
  const { orgId: organizationId, frameworkInstanceId } = await params;

  const frameworkRes = await serverApi.get<any>(
    `/v1/frameworks/${frameworkInstanceId}`,
  );

  if (!frameworkRes.data) {
    redirect(`/${organizationId}/frameworks`);
  }

  const framework = frameworkRes.data;
  const frameworkInstanceWithControls = {
    ...framework,
    controls: framework.controls ?? [],
  };
  const frameworkName = framework.framework?.name ?? 'Framework';

  return (
    <PageWithBreadcrumb
      breadcrumbs={[
        { label: 'Frameworks', href: `/${organizationId}/frameworks` },
        { label: frameworkName, current: true },
      ]}
    >
      <div className="flex flex-col gap-6">
        <FrameworkOverview
          frameworkInstanceWithControls={frameworkInstanceWithControls}
          tasks={framework.tasks || []}
        />
        <FrameworkRequirements
          requirementDefinitions={framework.requirementDefinitions || []}
          frameworkInstanceWithControls={frameworkInstanceWithControls}
        />
      </div>
    </PageWithBreadcrumb>
  );
}
