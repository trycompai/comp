import { Breadcrumb, PageHeader, PageLayout } from '@trycompai/design-system';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BUILT_IN_ROLE_OBLIGATIONS } from '@trycompai/auth';
import { serverApi } from '@/lib/api-server';
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

  // Resolve the effective obligations for this org — falls back to the
  // hardcoded default if the API call fails or no override is set.
  const overrideRes = await serverApi.get<{
    name: string;
    obligations: Record<string, boolean>;
  }>(`/v1/roles/built-in/${encodeURIComponent(roleName)}/obligations`);
  const effectiveObligations =
    overrideRes.data?.obligations ??
    ((BUILT_IN_ROLE_OBLIGATIONS[roleName] || {}) as Record<string, boolean>);

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
      <SystemRoleDetail
        roleName={roleName}
        permissions={permissions}
        obligations={effectiveObligations}
        description={role.description}
      />
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
