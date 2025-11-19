import { cache } from 'react';

import PageCore from '@/components/pages/PageCore.tsx';
import { db } from '@db';
import type { Metadata } from 'next';
import { ApiKeysTable } from './components/table/ApiKeysTable';

export default async function ApiKeysPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  const apiKeys = await getApiKeys(orgId);

  return (
    <PageCore>
      <ApiKeysTable apiKeys={apiKeys} />
    </PageCore>
  );
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'API',
  };
}

const getApiKeys = cache(async (orgId: string) => {
  const apiKeys = await db.apiKey.findMany({
    where: {
      organizationId: orgId,
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      createdAt: true,
      expiresAt: true,
      lastUsedAt: true,
      isActive: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return apiKeys.map((key) => ({
    ...key,
    createdAt: key.createdAt.toISOString(),
    expiresAt: key.expiresAt ? key.expiresAt.toISOString() : null,
    lastUsedAt: key.lastUsedAt ? key.lastUsedAt.toISOString() : null,
  }));
});
