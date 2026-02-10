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
    }>('/v1/tasks/options'),
  ]);

  const tasks = tasksRes.data?.data ?? [];
  const allMembers = membersRes.data?.data ?? [];
  const options = optionsRes.data ?? {
    controls: [],
    frameworkInstances: [],
    organizationName: null,
    hasEvidenceExportAccess: false,
  };

  // Filter members: exclude employee, auditor, contractor roles
  const excludedRoles = ['employee', 'auditor', 'contractor'];
  const members = allMembers.filter((m) => {
    const roles = m.role
      ?.split(',')
      .map((r) => r.trim())
      .filter(Boolean) ?? [];
    return !roles.some((r) => excludedRoles.includes(r));
  });

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
    />
  );
}
