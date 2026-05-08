import { requireAuditorViewAccess } from '@/lib/permissions.server';

export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  // CS-189: stricter than `requireRoutePermission('auditor', orgId)` — the
  // plain check let owner/admin through via their implicit audit:read.
  // requireAuditorViewAccess enforces "built-in auditor OR custom role with
  // explicit audit:read" to match the sidebar tab visibility.
  await requireAuditorViewAccess(orgId);
  return <>{children}</>;
}
