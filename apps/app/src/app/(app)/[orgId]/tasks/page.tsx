import { serverApi } from '@/lib/api-server';
import type { Member, Task, User } from '@db';
import { Metadata } from 'next';
import { cookies } from 'next/headers';
import { TasksPageClient } from './components/TasksPageClient';
import type { FrameworkInstanceForTasks } from './types';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Evidence',
  };
}

export const dynamic = 'force-dynamic';

type TaskWithRelations = Task & {
  controls: { id: string; name: string }[];
  evidenceAutomations?: Array<{
    id: string;
    isEnabled: boolean;
    name: string;
    runs?: Array<{
      status: string;
      success: boolean | null;
      evaluationStatus: string | null;
      createdAt: Date;
      triggeredBy: string;
      runDuration: number | null;
    }>;
  }>;
};

export default async function TasksPage({
  params,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;

  const [tasksRes, membersRes, optionsRes] = await Promise.all([
    serverApi.get<{ data: TaskWithRelations[]; count: number }>(
      '/v1/tasks?includeRelations=true',
    ),
    serverApi.get<{
      data: (Member & { user: User })[];
      count: number;
    }>('/v1/people'),
    serverApi.get<{
      controls: { id: string; name: string }[];
      frameworkInstances: FrameworkInstanceForTasks[];
      organizationName: string | null;
      hasEvidenceExportAccess: boolean;
      evidenceApprovalEnabled: boolean;
    }>('/v1/tasks/options'),
  ]);

  const tasks = tasksRes.data?.data ?? [];
  // Pass every org member to the overview + Assignee filter. A task can be assigned
  // to anyone via the task detail sidebar (which resolves assignees from the
  // unfiltered /v1/people list, including custom roles like "SecDev"). Pre-filtering
  // by built-in role name here made custom-role assignees resolve to "Unassigned" on
  // the overview and disappear from the Assignee filter (CS-571).
  const members = membersRes.data?.data ?? [];
  const options = optionsRes.data ?? {
    controls: [],
    frameworkInstances: [],
    organizationName: null,
    hasEvidenceExportAccess: false,
    evidenceApprovalEnabled: false,
  };

  // Read tab preference from cookie
  const cookieStore = await cookies();
  const savedView = cookieStore.get(`task-view-preference-${orgId}`)?.value;
  const activeTab =
    savedView === 'categories' || savedView === 'list'
      ? savedView
      : 'categories';

  return (
    <TasksPageClient
      tasks={tasks}
      members={members}
      controls={options.controls}
      frameworkInstances={options.frameworkInstances}
      activeTab={activeTab}
      orgId={orgId}
      organizationName={options.organizationName}
      hasEvidenceExportAccess={options.hasEvidenceExportAccess}
      evidenceApprovalEnabled={options.evidenceApprovalEnabled}
    />
  );
}
