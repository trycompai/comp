import { serverApi } from '@/lib/api-server';
import { Breadcrumb, PageHeader, PageLayout } from '@trycompai/design-system';
import type {
  Control,
  FrameworkEditorFramework,
  FrameworkEditorRequirement,
  FrameworkInstance,
  Policy,
  RequirementMap,
  Task,
} from '@db';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { SingleControl } from '@/app/(app)/[orgId]/controls/[controlId]/components/SingleControl';
import type { ControlProgressResponse } from '@/app/(app)/[orgId]/controls/[controlId]/data/getOrganizationControlProgress';

type ControlDetail = Control & {
  policies: Policy[];
  tasks: Task[];
  requirementsMapped: (RequirementMap & {
    frameworkInstance: FrameworkInstance & {
      framework: FrameworkEditorFramework;
    };
    requirement: FrameworkEditorRequirement;
  })[];
  progress: ControlProgressResponse;
};

interface PageProps {
  params: Promise<{
    orgId: string;
    frameworkInstanceId: string;
    controlId: string;
  }>;
}

export default async function FrameworkControlPage({ params }: PageProps) {
  const { orgId, frameworkInstanceId, controlId } = await params;

  const [controlRes, frameworkRes] = await Promise.all([
    serverApi.get<ControlDetail>(`/v1/controls/${controlId}`),
    serverApi.get<any>(`/v1/frameworks/${frameworkInstanceId}`),
  ]);

  if (!controlRes.data || controlRes.error) {
    redirect(`/${orgId}/frameworks/${frameworkInstanceId}`);
  }

  const control = controlRes.data;
  const frameworkName = frameworkRes.data?.framework?.name ?? 'Framework';
  const controlProgress: ControlProgressResponse = control.progress ?? {
    total: 0,
    completed: 0,
    progress: 0,
    byType: {},
  };

  return (
    <PageLayout>
      <Breadcrumb
        items={[
          {
            label: 'Frameworks',
            href: `/${orgId}/frameworks`,
            props: { render: <Link href={`/${orgId}/frameworks`} /> },
          },
          {
            label: frameworkName,
            href: `/${orgId}/frameworks/${frameworkInstanceId}`,
            props: { render: <Link href={`/${orgId}/frameworks/${frameworkInstanceId}`} /> },
          },
          { label: control.name, isCurrent: true },
        ]}
      />
      <PageHeader title={control.name} />
      <SingleControl
        control={control}
        controlProgress={controlProgress}
        relatedPolicies={control.policies}
        relatedTasks={control.tasks}
      />
    </PageLayout>
  );
}
