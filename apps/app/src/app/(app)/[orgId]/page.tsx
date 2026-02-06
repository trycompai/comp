import { getDefaultRoute } from '@/lib/permissions';
import { resolveCurrentUserPermissions } from '@/lib/permissions.server';
import { redirect } from 'next/navigation';

export default async function DashboardPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId: organizationId } = await params;

  const permissions = await resolveCurrentUserPermissions(organizationId);
  const defaultRoute = permissions
    ? getDefaultRoute(permissions, organizationId)
    : null;

  return redirect(defaultRoute ?? '/no-access');
}
