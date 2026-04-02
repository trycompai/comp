import { serverApi } from '@/lib/api-server';
import { Breadcrumb, PageHeader, PageLayout } from '@trycompai/design-system';
import Link from 'next/link';
import { redirect } from 'next/navigation';
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
    <PageLayout>
      <Breadcrumb
        items={[
          {
            label: 'Frameworks',
            href: `/${organizationId}/frameworks`,
            props: { render: <Link href={`/${organizationId}/frameworks`} /> },
          },
          { label: frameworkName, isCurrent: true },
        ]}
      />
      <FrameworkOverview
        frameworkInstanceWithControls={frameworkInstanceWithControls}
        tasks={framework.tasks || []}
        evidenceSubmissions={framework.evidenceSubmissions || []}
      />
      <FrameworkRequirements
        requirementDefinitions={framework.requirementDefinitions || []}
        frameworkInstanceWithControls={frameworkInstanceWithControls}
        tasks={framework.tasks || []}
        evidenceSubmissions={framework.evidenceSubmissions || []}
      />
    </PageLayout>
  );
}
