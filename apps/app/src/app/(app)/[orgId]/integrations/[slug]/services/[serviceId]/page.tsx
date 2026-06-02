import { serverApi } from '@/lib/api-server';
import { PageLayout } from '@trycompai/design-system';
import type {
  ConnectionListItemResponse,
  IntegrationProviderResponse,
} from '@trycompai/integration-platform';
import { redirect } from 'next/navigation';
import {
  type IntegrationTaskApiResponse,
  mapTaskTemplates,
} from '../../lib/task-templates';
import { ServiceDetailView } from './components/ServiceDetailView';

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
    serverApi.get<IntegrationTaskApiResponse>('/v1/tasks'),
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
  const { templates: taskTemplates, errored: tasksErrored } = mapTaskTemplates(tasksResult);

  return (
    <PageLayout>
      <ServiceDetailView
        provider={provider}
        service={service}
        connections={connections}
        connectionId={connectionId}
        taskTemplates={taskTemplates}
        tasksErrored={tasksErrored}
        orgId={orgId}
        slug={slug}
      />
    </PageLayout>
  );
}
