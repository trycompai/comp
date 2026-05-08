import { serverApi } from '@/lib/api-server';
import { PageLayout } from '@trycompai/design-system';
import type {
  ConnectionListItemResponse,
  IntegrationProviderResponse,
} from '@trycompai/integration-platform';
import { redirect } from 'next/navigation';
import { ProviderDetailView } from './components/ProviderDetailView';

interface TaskApiResponse {
  data: Array<{
    id: string;
    title: string;
    description: string;
    taskTemplateId: string | null;
  }>;
}

interface PageProps {
  params: Promise<{ orgId: string; slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ProviderDetailPage({ params, searchParams }: PageProps) {
  const { orgId, slug } = await params;
  const sp = await searchParams;
  const success = typeof sp.success === 'string' ? sp.success : '';
  const providerParam = typeof sp.provider === 'string' ? sp.provider : '';
  const gcpOAuthJustConnected = slug === 'gcp' && success === 'true' && providerParam === 'gcp';

  const [providerResult, connectionsResult, tasksResult] = await Promise.all([
    serverApi.get<IntegrationProviderResponse>(`/v1/integrations/connections/providers/${slug}`),
    serverApi.get<ConnectionListItemResponse[]>('/v1/integrations/connections'),
    serverApi.get<TaskApiResponse>('/v1/tasks'),
  ]);

  if (!providerResult.data || providerResult.error) {
    redirect(`/${orgId}/integrations`);
  }

  const provider = providerResult.data;
  const connections = (connectionsResult.data ?? []).filter((c) => c.providerSlug === slug);
  const taskTemplates = (tasksResult.data?.data ?? [])
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
      <ProviderDetailView
        provider={provider}
        initialConnections={connections}
        taskTemplates={taskTemplates}
        gcpOAuthJustConnected={gcpOAuthJustConnected}
      />
    </PageLayout>
  );
}
