import { db } from '@db';
import { PageHeader, PageLayout, Stack } from '@trycompai/design-system';
import { PlatformIntegrations } from './components/PlatformIntegrations';

export default async function IntegrationsPage() {
  // Fetch task templates server-side
  const taskTemplates = await db.frameworkEditorTaskTemplate.findMany({
    select: {
      id: true,
      name: true,
      description: true,
    },
    orderBy: {
      name: 'asc',
    },
  });

  return (
    <PageLayout>
      <Stack gap="md">
        <PageHeader title="Integrations" />
        <PlatformIntegrations taskTemplates={taskTemplates} />
      </Stack>
    </PageLayout>
  );
}
