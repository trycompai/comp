import { PageLayout } from '@trycompai/design-system';
import { redirect } from 'next/navigation';
import { ProviderDetailView } from './components/ProviderDetailView';
import { loadIntegrationPageData } from './lib/load-integration-page-data';

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

  const { provider, providerErrored, connections, taskTemplates } =
    await loadIntegrationPageData(slug, { sortTasks: true });

  if (!provider || providerErrored) {
    redirect(`/${orgId}/integrations`);
  }

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
