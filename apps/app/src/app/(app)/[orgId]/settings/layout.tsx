import { requireRoutePermission } from '@/lib/permissions.server';
import { auth } from '@/utils/auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { SettingsTabs } from './components/SettingsTabs';

export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;

  await requireRoutePermission('settings', orgId);

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return redirect('/');
  }

  return (
    <SettingsTabs orgId={orgId} showBrowserTab={false}>
      {children}
    </SettingsTabs>
  );
}
