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

  const [providersRes, findingsRes] = await Promise.all([
    serverApi.get<{ data: Provider[]; count: number }>(
      '/v1/cloud-security/providers',
    ),
    serverApi.get<{ data: Finding[]; count: number }>(
      '/v1/cloud-security/findings',
    ),
  ]);

  if (providersRes.status === 401 || findingsRes.status === 401) {
    redirect('/');
  }

  const providers = Array.isArray(providersRes.data?.data)
    ? providersRes.data.data
    : [];
  const findings = Array.isArray(findingsRes.data?.data)
    ? findingsRes.data.data
    : [];

  return (
    <TestsLayout
      initialFindings={findings}
      initialProviders={providers}
      orgId={orgId}
    />
  );
}
