import { serverApi } from '@/lib/api-server';
import { Breadcrumb, PageHeader, PageLayout } from '@trycompai/design-system';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { RequirementControls } from './components/RequirementControls';

interface PageProps {
  params: Promise<{
    orgId: string;
    frameworkInstanceId: string;
    requirementKey: string;
  }>;
}

export default async function RequirementPage({ params }: PageProps) {
  const { orgId: organizationId, frameworkInstanceId, requirementKey } =
    await params;

  const [frameworkRes, requirementRes] = await Promise.all([
    serverApi.get<any>(`/v1/frameworks/${frameworkInstanceId}`),
    serverApi.get<any>(
      `/v1/frameworks/${frameworkInstanceId}/requirements/${requirementKey}`,
    ),
  ]);

  if (!frameworkRes.data || !requirementRes.data) {
    redirect(`/${organizationId}/frameworks/${frameworkInstanceId}`);
  }

  const framework = frameworkRes.data;
  const reqData = requirementRes.data;
  const frameworkName = framework.framework?.name ?? 'Framework';
  const requirement = reqData.requirement;

  return (
    <PageLayout>
      <Breadcrumb
        items={[
          {
            label: 'Frameworks',
            href: `/${organizationId}/frameworks`,
            props: { render: <Link href={`/${organizationId}/frameworks`} /> },
          },
          {
            label: frameworkName,
            href: `/${organizationId}/frameworks/${frameworkInstanceId}`,
            props: { render: <Link href={`/${organizationId}/frameworks/${frameworkInstanceId}`} /> },
          },
          { label: requirement.name, isCurrent: true },
        ]}
      />
      <PageHeader title={requirement.name} />
      <RequirementControls
        tasks={reqData.tasks ?? []}
        relatedControls={reqData.relatedControls ?? []}
        evidenceSubmissions={reqData.evidenceSubmissions ?? []}
        frameworkInstanceId={frameworkInstanceId}
      />
    </PageLayout>
  );
}
