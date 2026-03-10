import { serverApi } from '@/lib/api-server';
import type { Metadata } from 'next';
import { ApiKeysTable } from './components/table/ApiKeysTable';

export default async function ApiKeysPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;

  const res = await serverApi.get<{
    data: Array<{
      id: string;
      name: string;
      createdAt: string;
      expiresAt: string | null;
      lastUsedAt: string | null;
      isActive: boolean;
      scopes: string[];
    }>;
    count: number;
  }>('/v1/organization/api-keys');

  const apiKeys = res.data?.data ?? [];

  return <ApiKeysTable initialApiKeys={apiKeys} />;
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'API',
  };
}
