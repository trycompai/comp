import { MinimalHeader } from '@/components/layout/MinimalHeader';
import { serverApi } from '@/lib/api-server';
import type { OrganizationFromMe } from '@/types';
import { auth } from '@/utils/auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function UpgradeLayout({ children }: { children: React.ReactNode }) {
  // Check auth
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    redirect('/sign-in');
  }

  // Get organizations for switcher via API
  const meRes = await serverApi.get<{ organizations: OrganizationFromMe[] }>('/v1/auth/me');
  const organizations = meRes.data?.organizations ?? [];

  // Get current active organization from session
  const currentOrgId = session.session.activeOrganizationId;
  const currentOrganization = currentOrgId
    ? organizations.find((org) => org.id === currentOrgId) || null
    : null;

  const user = session.user;

  return (
    <div className="min-h-dvh">
      <MinimalHeader
        user={user}
        organizations={organizations}
        currentOrganization={currentOrganization}
        variant="upgrade"
      />

      {/* Main content */}
      <main>{children}</main>
    </div>
  );
}
