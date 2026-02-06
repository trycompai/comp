import { requireRoutePermission } from '@/lib/permissions.server';
import { PageHeader, PageLayout } from '@trycompai/design-system';

export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  await requireRoutePermission('frameworks', orgId);

  return (
    <PageLayout header={<PageHeader title="Overview" />} padding="default">
      {children}
    </PageLayout>
  );
}
