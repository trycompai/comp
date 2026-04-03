import { serverApi } from '@/lib/api-server';
import { redirect } from 'next/navigation';
import { TestsLayout } from './components/TestsLayout';
import type { Finding, Provider } from './types';

export default async function CloudTestsPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;

  // Fetch providers and findings from the API in parallel
  const [providersResponse, findingsResponse] = await Promise.all([
    serverApi.get<{ data: Provider[]; count: number }>(
      '/v1/cloud-security/providers',
    ),
    serverApi.get<{ data: Finding[]; count: number }>(
      '/v1/cloud-security/findings',
    ),
  ]);

  // If both fail with auth errors, redirect to home
  if (providersResponse.status === 401 || providersResponse.status === 403) {
    redirect('/');
  }

  const providers = Array.isArray(providersResponse.data?.data)
    ? providersResponse.data.data
    : [];

  const findings = Array.isArray(findingsResponse.data?.data)
    ? findingsResponse.data.data
    : [];

  return (
    <TestsLayout
      initialFindings={findings}
      initialProviders={providers}
      orgId={orgId}
    />
  );
}
