import { serverApi } from '@/lib/api-server';
import type { IntegrationProviderResponse } from '@trycompai/integration-platform';
import type { ConnectionListItemResponse } from '@trycompai/integration-platform';
import { PageLayout } from '@trycompai/design-system';
import { redirect } from 'next/navigation';
import { ProviderDetailView } from './components/ProviderDetailView';

interface PageProps {
  params: Promise<{ orgId: string; slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ProviderDetailPage({ params, searchParams }: PageProps) {
  const { orgId, slug } = await params;
  const sp = await searchParams;
  const success = typeof sp.success === 'string' ? sp.success : '';
  const providerParam = typeof sp.provider === 'string' ? sp.provider : '';
  const gcpOAuthJustConnected =
    slug === 'gcp' && success === 'true' && providerParam === 'gcp';

  const [providerResult, connectionsResult] = await Promise.all([
    serverApi.get<IntegrationProviderResponse>(
      `/v1/integrations/connections/providers/${slug}`,
    ),
    serverApi.get<ConnectionListItemResponse[]>(
      '/v1/integrations/connections',
    ),
  ]);

  if (!providerResult.data || providerResult.error) {
    redirect(`/${orgId}/integrations`);
  }

  const provider = providerResult.data;
  const connections = (connectionsResult.data ?? []).filter(
    (c) => c.providerSlug === slug,
  );

  return (
    <PageLayout>
      <ProviderDetailView
        provider={provider}
        initialConnections={connections}
        gcpOAuthJustConnected={gcpOAuthJustConnected}
      />
    </PageLayout>
  );
}
