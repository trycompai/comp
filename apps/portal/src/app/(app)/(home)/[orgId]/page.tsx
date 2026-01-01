import { notFound } from 'next/navigation';
import { OrganizationDashboardGateClient } from './components/OrganizationDashboardGateClient';
import { getEmployeePortalOverview } from './data/queries';

export default async function OrganizationPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;

  // Guard: `[orgId]` can accidentally match requests like `/some-file.js.map`.
  // Our organization IDs are prefixed CUIDs like `org_...` (see db schema).
  if (!orgId.startsWith('org_')) {
    return notFound();
  }

  // Best-effort SSR: for OTP sessions this can hydrate instantly.
  // For Google OAuth where the session cookie lives on the API origin, this may fail and we fall back to client fetch.
  const initialDashboard = await getEmployeePortalOverview(orgId).catch(() => undefined);

  return (
    <OrganizationDashboardGateClient organizationId={orgId} initialDashboard={initialDashboard} />
  );
}
