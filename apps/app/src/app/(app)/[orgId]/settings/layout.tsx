import { getFeatureFlags } from '@/app/posthog';
import { auth } from '@/utils/auth';
import { SecondaryMenu } from '@comp/ui/secondary-menu';
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

  let isWebAutomationsEnabled = false;
  if (session.user?.id) {
    const flags = await getFeatureFlags(session.user.id);
    isWebAutomationsEnabled =
      flags['is-web-automations-enabled'] === true ||
      flags['is-web-automations-enabled'] === 'true';
  }

  const items = [
    {
      path: `/${orgId}/settings`,
      label: 'General',
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
    ...(isWebAutomationsEnabled
      ? [
          {
            path: `/${orgId}/settings/browser-connection`,
            label: 'Browser',
          },
        ]
      : []),
    {
      path: `/${orgId}/settings/user`,
      label: 'User Settings',
    },
  ] satisfies Array<{ path: string; label: string }>;

  return (
    <div className="m-auto max-w-[1200px] py-8">
      <Suspense fallback={<div>Loading...</div>}>
        <SecondaryMenu items={items} />
      </Suspense>

      <div>{children}</div>
    </div>
  );
}
