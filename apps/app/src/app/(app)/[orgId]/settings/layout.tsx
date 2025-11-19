import { SecondaryMenu } from '@comp/ui/secondary-menu';
import { Suspense } from 'react';

export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;

  return (
    <div className="m-auto max-w-[1200px] py-8">
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
              path: `/${orgId}/settings/secrets`,
              label: 'Secrets',
            },
          ]}
        />
      </Suspense>

      <div>{children}</div>
    </div>
  );
}
