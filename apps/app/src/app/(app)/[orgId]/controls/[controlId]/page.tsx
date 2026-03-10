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
import { ControlHeaderActions } from './components/ControlHeaderActions';
import { SingleControl } from './components/SingleControl';
import type { ControlProgressResponse } from './data/getOrganizationControlProgress';

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

interface ControlPageProps {
  params: {
    controlId: string;
    orgId: string;
  };
}

export default async function ControlPage({ params }: ControlPageProps) {
  const { controlId, orgId } = await Promise.resolve(params);

  const controlRes = await serverApi.get<ControlDetail>(
    `/v1/controls/${controlId}`,
  );

  if (!controlRes.data || controlRes.error) {
    redirect('/');
  }

  const control = controlRes.data;
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
            label: 'Controls',
            href: `/${orgId}/controls`,
            props: { render: <Link href={`/${orgId}/controls`} /> },
          },
          { label: control.name, isCurrent: true },
        ]}
      />
      <PageHeader
        title={control.name}
        actions={<ControlHeaderActions control={control} />}
      />
      <SingleControl
        control={control}
        controlProgress={controlProgress}
        relatedPolicies={control.policies}
        relatedTasks={control.tasks}
      />
    </PageLayout>
  );
}
