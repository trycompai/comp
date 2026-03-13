import { serverApi } from '@/lib/api-server';
import { AdminOrgTabs, type AdminOrgDetail } from './components/AdminOrgTabs';

export default async function AdminOrganizationDetailPage({
  params,
}: {
  params: Promise<{ orgId: string; adminOrgId: string }>;
}) {
  const { orgId, adminOrgId } = await params;
  const res = await serverApi.get<AdminOrgDetail>(
    `/v1/admin/organizations/${adminOrgId}`,
  );

  if (!res.data) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        Organization not found.
      </div>
    );
  }

  return <AdminOrgTabs org={res.data} currentOrgId={orgId} />;
}
