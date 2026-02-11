import { Breadcrumb, PageHeader, PageLayout } from '@trycompai/design-system';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SYSTEM_ROLES, SYSTEM_ROLE_PERMISSIONS } from '../../constants/system-roles';
import { SystemRoleDetail } from './system-role-detail';

export default async function SystemRolePage({
  params,
}: {
  params: Promise<{ orgId: string; roleName: string }>;
}) {
  const { orgId, roleName } = await params;

  const role = SYSTEM_ROLES.find((r) => r.key === roleName);
  const permissions = SYSTEM_ROLE_PERMISSIONS[roleName];

  if (!role || !permissions) {
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
      <PageHeader title={role.name} />
      <SystemRoleDetail permissions={permissions} description={role.description} />
    </PageLayout>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ roleName: string }>;
}): Promise<Metadata> {
  const { roleName } = await params;
  const role = SYSTEM_ROLES.find((r) => r.key === roleName);

  return {
    title: role ? `${role.name} Role` : 'System Role',
  };
}
