import { serverApi } from '@/lib/api-server';
import { PageLayout } from '@trycompai/design-system';
import type {
  ConnectionListItemResponse,
  IntegrationProviderResponse,
} from '@trycompai/integration-platform';
import { redirect } from 'next/navigation';
import { ServiceDetailView } from './components/ServiceDetailView';

interface TaskApiResponse {
  data: Array<{
    id: string;
    title: string;
    description: string;
    taskTemplateId: string | null;
  }>;
}

interface PageProps {
  params: Promise<{ orgId: string; slug: string; serviceId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ServiceDetailPage({ params, searchParams }: PageProps) {
  const { orgId, slug, serviceId } = await params;
  const sp = await searchParams;
  const connectionId = typeof sp.connectionId === 'string' ? sp.connectionId : null;

  const [providerResult, connectionsResult, tasksResult] = await Promise.all([
    serverApi.get<IntegrationProviderResponse>(`/v1/integrations/connections/providers/${slug}`),
    serverApi.get<ConnectionListItemResponse[]>('/v1/integrations/connections'),
    serverApi.get<TaskApiResponse>('/v1/tasks'),
  ]);

  const provider = providerResult.data;
  if (!provider || providerResult.error) {
    redirect(`/${orgId}/integrations`);
  }

  const service = (provider.services ?? []).find((s) => s.id === serviceId);
  if (!service) {
    redirect(`/${orgId}/integrations/${slug}`);
  }

  const connections = (connectionsResult.data ?? []).filter((c) => c.providerSlug === slug);
  const taskTemplates = (tasksResult.data?.data ?? [])
    .filter((task) => task.taskTemplateId)
    .map((task) => ({
      id: task.taskTemplateId as string,
      taskId: task.id,
      name: task.title,
      description: task.description,
    }));

  return (
    <PageLayout>
      <ServiceDetailView
        provider={provider}
        service={service}
        connections={connections}
        connectionId={connectionId}
        taskTemplates={taskTemplates}
        orgId={orgId}
        slug={slug}
      />
    </PageLayout>
  );
}
