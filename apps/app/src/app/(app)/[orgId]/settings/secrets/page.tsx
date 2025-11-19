import { db } from '@db';
import type { Metadata } from 'next';
import { cache } from 'react';
import { SecretsTable } from './components/table/SecretsTable';

export default async function SecretsPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  const secrets = await getSecrets(orgId);

  return <SecretsTable secrets={secrets} />;
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Secrets',
  };
}

const getSecrets = cache(async (orgId: string) => {
  const secrets = await db.secret.findMany({
    where: {
      organizationId: orgId,
    },
    select: {
      id: true,
      name: true,
      description: true,
      category: true,
      createdAt: true,
      updatedAt: true,
      lastUsedAt: true,
    },
    orderBy: {
      name: 'asc',
    },
  });

  return secrets.map((secret) => ({
    ...secret,
    createdAt: secret.createdAt.toISOString(),
    updatedAt: secret.updatedAt.toISOString(),
    lastUsedAt: secret.lastUsedAt ? secret.lastUsedAt.toISOString() : null,
  }));
});
