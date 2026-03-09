import { serverApi } from '@/lib/api-server';
import { PageHeader, PageLayout, Stack } from '@trycompai/design-system';
import { PlatformIntegrations } from './components/PlatformIntegrations';

interface TaskApiResponse {
  data: Array<{
    id: string;
    title: string;
    description: string;
    taskTemplateId: string | null;
  }>;
}

interface PageProps {
  params: Promise<{ orgId: string }>;
}

export default async function IntegrationsPage({ params }: PageProps) {
  const { orgId } = await params;

  // Fetch organization's tasks via API
  const tasksResult = await serverApi.get<TaskApiResponse>('/v1/tasks');
  const allTasks = tasksResult.data?.data ?? [];

  // Filter to tasks that have a template (can be automated)
  const taskTemplates = allTasks
    .filter((task) => task.taskTemplateId)
    .map((task) => ({
      id: task.taskTemplateId as string,
      taskId: task.id,
      name: task.title,
      description: task.description,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <PageLayout>
      <Stack gap="md">
        <PageHeader title="Integrations" />
        <PlatformIntegrations taskTemplates={taskTemplates} />
      </Stack>
    </PageLayout>
  );
}
