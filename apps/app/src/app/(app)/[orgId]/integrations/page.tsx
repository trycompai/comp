import { db } from '@db';
import { PageHeader, PageLayout, Stack } from '@trycompai/design-system';
import { PlatformIntegrations } from './components/PlatformIntegrations';

interface PageProps {
  params: Promise<{ orgId: string }>;
}

export default async function IntegrationsPage({ params }: PageProps) {
  const { orgId } = await params;

  // Fetch organization's tasks that have a template (can be automated)
  const orgTasks = await db.task.findMany({
    where: {
      organizationId: orgId,
      taskTemplateId: { not: null },
    },
    select: {
      id: true,
      title: true,
      description: true,
      taskTemplateId: true,
    },
    orderBy: {
      title: 'asc',
    },
  });

  // Map to the format expected by the component
  const taskTemplates = orgTasks.map((task) => ({
    id: task.taskTemplateId as string, // Used as taskTemplateId for matching
    taskId: task.id, // Actual task ID for navigation
    name: task.title,
    description: task.description,
  }));

  return (
    <PageLayout>
      <Stack gap="md">
        <PageHeader title="Integrations" />
        <PlatformIntegrations taskTemplates={taskTemplates} />
      </Stack>
    </PageLayout>
  );
}
