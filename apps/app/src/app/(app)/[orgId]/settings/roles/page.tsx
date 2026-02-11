import { serverApi } from '@/lib/api-server';
import type { Metadata } from 'next';
import { RolesPageClient } from './components/RolesPageClient';
import type { CustomRole } from './components/RolesTable';

export const metadata: Metadata = {
  title: 'Roles',
};

export default async function RolesPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;

  const res = await serverApi.get<{
    builtInRoles: Array<{ name: string; isBuiltIn: boolean; description: string }>;
    customRoles: CustomRole[];
  }>('/v1/roles');

  const roles = res.data?.customRoles ?? [];

  return <RolesPageClient initialData={roles} />;
}
