import { serverApi } from '@/lib/api-server';
import type { Metadata } from 'next';
import { SecretsTable } from './components/table/SecretsTable';

export default async function SecretsPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;

  const res = await serverApi.get<{
    data: Array<{
      id: string;
      name: string;
      description: string | null;
      category: string | null;
      createdAt: string;
      updatedAt: string;
      lastUsedAt: string | null;
    }>;
    count: number;
  }>('/v1/secrets');

  const secrets = res.data?.data ?? [];

  return <SecretsTable initialSecrets={secrets} />;
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Secrets',
  };
}
