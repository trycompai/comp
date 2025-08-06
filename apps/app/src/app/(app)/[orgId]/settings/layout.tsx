import { auth } from '@/utils/auth';
import { SecondaryMenu } from '@comp/ui/secondary-menu';
import { T } from 'gt-next';
import { getGT } from 'gt-next/server';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';

export default async function Layout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const orgId = session?.session.activeOrganizationId;

  if (!session) {
    return redirect('/');
  }

  const t = await getGT();

  return (
    <div className="m-auto max-w-[1200px]">
      <Suspense
        fallback={
          <T>
            <div>Loading...</div>
          </T>
        }
      >
        <SecondaryMenu
          items={[
            {
              path: `/${orgId}/settings`,
              label: t('General'),
            },
            {
              path: `/${orgId}/settings/trust-portal`,
              label: t('Trust Portal'),
            },
            {
              path: `/${orgId}/settings/context-hub`,
              label: t('Context'),
            },
            {
              path: `/${orgId}/settings/api-keys`,
              label: t('API'),
            },
          ]}
        />
      </Suspense>

      <div>{children}</div>
    </div>
  );
}
