import { requireRoutePermission } from '@/lib/permissions.server';
import type { Metadata } from 'next';
import { RolesPageClient } from './components/RolesPageClient';
import { getRoles } from './data/getRoles';

export const metadata: Metadata = {
  title: 'Roles',
};

export default async function RolesPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;

  await requireRoutePermission('settings/roles', orgId);

  const roles = await getRoles(orgId);

  return <RolesPageClient initialData={roles} />;
}
