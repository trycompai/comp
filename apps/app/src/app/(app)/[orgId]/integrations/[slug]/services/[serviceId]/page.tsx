import { PageLayout } from '@trycompai/design-system';
import { redirect } from 'next/navigation';
import { loadIntegrationPageData } from '../../lib/load-integration-page-data';
import { ServiceDetailView } from './components/ServiceDetailView';

interface PageProps {
  params: Promise<{ orgId: string; slug: string; serviceId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ServiceDetailPage({ params, searchParams }: PageProps) {
  const { orgId, slug, serviceId } = await params;
  const sp = await searchParams;
  const connectionId = typeof sp.connectionId === 'string' ? sp.connectionId : null;

  const {
    provider,
    providerErrored,
    connections,
    connectionsErrored,
    taskTemplates,
    tasksErrored,
  } = await loadIntegrationPageData(slug);

  if (!provider || providerErrored) {
    redirect(`/${orgId}/integrations`);
  }

  const service = (provider.services ?? []).find((s) => s.id === serviceId);
  if (!service) {
    redirect(`/${orgId}/integrations/${slug}`);
  }

  return (
    <PageLayout>
      <ServiceDetailView
        provider={provider}
        service={service}
        connections={connections}
        connectionId={connectionId}
        connectionsErrored={connectionsErrored}
        taskTemplates={taskTemplates}
        tasksErrored={tasksErrored}
        orgId={orgId}
        slug={slug}
      />
    </PageLayout>
  );
}
