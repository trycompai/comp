import { serverApi } from '@/lib/api-server';
import { PageLayout } from '@trycompai/design-system';
import type {
  ConnectionListItemResponse,
  IntegrationProviderResponse,
} from '@trycompai/integration-platform';
import { redirect } from 'next/navigation';
import { ProviderDetailView } from './components/ProviderDetailView';
import {
  type IntegrationTaskApiResponse,
  mapTaskTemplates,
} from './lib/task-templates';

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
    serverApi.get<IntegrationTaskApiResponse>('/v1/tasks'),
  ]);

  if (!providerResult.data || providerResult.error) {
    redirect(`/${orgId}/integrations`);
  }

  const provider = providerResult.data;
  const connections = (connectionsResult.data ?? []).filter((c) => c.providerSlug === slug);
  const { templates: taskTemplates } = mapTaskTemplates(tasksResult, { sort: true });

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
