import { serverApi } from '@/lib/api-server';
import { Breadcrumb, PageHeader, PageLayout } from '@trycompai/design-system';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { CustomRole } from '../components/RolesTable';
import { EditRolePageClient } from './components/EditRolePageClient';

export default async function EditRolePage({
  params,
}: {
  params: Promise<{ orgId: string; roleId: string }>;
}) {
  const { orgId, roleId } = await params;

  const res = await serverApi.get<CustomRole>(`/v1/roles/${roleId}`);
  const role = res.data;

  if (!role) {
    notFound();
  }

  return (
    <PageLayout>
      <Breadcrumb
        items={[
          {
            label: 'Roles',
            href: `/${orgId}/settings/roles`,
            props: { render: <Link href={`/${orgId}/settings/roles`} /> },
          },
          { label: role.name, isCurrent: true },
        ]}
      />
      <PageHeader title={`Edit Role: ${role.name}`} />
      <EditRolePageClient orgId={orgId} roleId={roleId} initialData={role} />
    </PageLayout>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ roleId: string; orgId: string }>;
}): Promise<Metadata> {
  const { roleId, orgId } = await params;

  const res = await serverApi.get<CustomRole>(`/v1/roles/${roleId}`);
  const role = res.data;

  return {
    title: role ? `Edit Role: ${role.name}` : 'Edit Role',
  };
}
