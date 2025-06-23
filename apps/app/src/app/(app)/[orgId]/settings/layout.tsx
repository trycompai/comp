import { auth } from '@/utils/auth';
import { SecondaryMenu } from '@comp/ui/secondary-menu';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';

export default async function Layout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const user = session?.user;
  const orgId = session?.session.activeOrganizationId;

  if (!session) {
    return redirect('/');
  }

  return (
    <div className="m-auto max-w-[1200px]">
      <Suspense fallback={<div>Loading...</div>}>
        <SecondaryMenu
          items={[
            {
              path: `/${orgId}/settings`,
              label: 'General',
            },
            {
              path: `/${orgId}/settings/trust-portal`,
              label: 'Trust Portal',
            },
            {
              path: `/${orgId}/settings/context-hub`,
              label: 'Context',
            },
            {
              path: `/${orgId}/settings/api-keys`,
              label: 'API',
            },
            {
              path: `/${orgId}/settings/billing`,
              label: 'Billing',
            },
          ]}
        />
      </Suspense>

      <div>{children}</div>
    </div>
  );
}
