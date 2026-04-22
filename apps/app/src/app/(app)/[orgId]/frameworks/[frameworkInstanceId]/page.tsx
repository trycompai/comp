import { serverApi } from '@/lib/api-server';
import { Breadcrumb, PageHeader, PageLayout } from '@trycompai/design-system';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { FrameworkOverview } from './components/FrameworkOverview';
import { FrameworkRequirements } from './components/FrameworkRequirements';
import { FrameworkTimeline } from './components/FrameworkTimeline';
import { FrameworkVersioningSection } from './components/FrameworkVersioningSection';
import type { FrameworkUpdateStatus } from '@/types/framework-versioning';

interface PageProps {
  params: Promise<{
    orgId: string;
    frameworkInstanceId: string;
  }>;
}

export default async function FrameworkPage({ params }: PageProps) {
  const { orgId: organizationId, frameworkInstanceId } = await params;

  const [frameworkRes, updateStatusRes] = await Promise.all([
    serverApi.get<any>(`/v1/frameworks/${frameworkInstanceId}`),
    serverApi.get<{ data: FrameworkUpdateStatus }>(
      `/v1/frameworks/${frameworkInstanceId}/update-status`,
    ),
  ]);

  if (!frameworkRes.data) {
    redirect(`/${organizationId}/frameworks`);
  }

  const framework = frameworkRes.data;
  const frameworkInstanceWithControls = {
    ...framework,
    controls: framework.controls ?? [],
  };
  const frameworkName = framework.framework?.name ?? 'Framework';
  const initialStatus = updateStatusRes.data?.data ?? undefined;

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
      <FrameworkVersioningSection
        frameworkInstanceId={frameworkInstanceId}
        initialStatus={initialStatus}
        hasActiveAudit={false}
      />
      <FrameworkOverview
        frameworkInstanceWithControls={frameworkInstanceWithControls}
        tasks={framework.tasks || []}
        evidenceSubmissions={framework.evidenceSubmissions || []}
      />
      <FrameworkTimeline frameworkInstanceId={frameworkInstanceId} />
      <FrameworkRequirements
        requirementDefinitions={framework.requirementDefinitions || []}
        frameworkInstanceWithControls={frameworkInstanceWithControls}
        tasks={framework.tasks || []}
        evidenceSubmissions={framework.evidenceSubmissions || []}
      />
    </PageLayout>
  );
}
