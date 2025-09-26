import { auth } from '@/utils/auth';
import { db } from '@db';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { cache } from 'react';
import { SecretsTable } from './components/table/SecretsTable';

export default async function SecretsPage() {
  const secrets = await getSecrets();

  return <SecretsTable secrets={secrets} />;
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Secrets',
  };
}

const getSecrets = cache(async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.session.activeOrganizationId) {
    return [];
  }

  const secrets = await db.secret.findMany({
    where: {
      organizationId: session.session.activeOrganizationId,
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
