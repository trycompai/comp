import { Breadcrumb, PageHeader, PageLayout } from '@trycompai/design-system';
import type { Metadata } from 'next';
import Link from 'next/link';
import { NewRoleForm } from './components/NewRoleForm';

export default async function NewRolePage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;

  return (
    <PageLayout>
      <Breadcrumb
        items={[
          {
            label: 'Roles',
            href: `/${orgId}/settings/roles`,
            props: { render: <Link href={`/${orgId}/settings/roles`} /> },
          },
          { label: 'Create Role', isCurrent: true },
        ]}
      />
      <PageHeader title="Create Custom Role" />
      <NewRoleForm orgId={orgId} />
    </PageLayout>
  );
}

export const metadata: Metadata = {
  title: 'Create Custom Role',
};
