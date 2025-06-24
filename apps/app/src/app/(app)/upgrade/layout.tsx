import { MinimalHeader } from '@/components/layout/MinimalHeader';
import { getOrganizations } from '@/data/getOrganizations';
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

  // Get organizations for switcher
  const { organizations } = await getOrganizations();

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
