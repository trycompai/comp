import { auth } from '@/app/lib/auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function OrgLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  const requestHeaders = await headers();

  const session = await auth.api.getSession({ headers: requestHeaders });

  if (!session?.user) {
    return redirect('/auth');
  }

  // Sync activeOrganizationId if it doesn't match the URL's orgId.
  // Without this, multi-org users get 403s because HybridAuthGuard
  // resolves memberId from the session's activeOrganizationId, not the URL.
  const currentActiveOrgId = session.session.activeOrganizationId;
  if (!currentActiveOrgId || currentActiveOrgId !== orgId) {
    await auth.api.setActiveOrganization({
      headers: requestHeaders,
      body: { organizationId: orgId },
    });
  }

  return <>{children}</>;
}
