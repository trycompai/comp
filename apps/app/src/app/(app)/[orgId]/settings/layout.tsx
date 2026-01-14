import { getFeatureFlags } from '@/app/posthog';
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

  const session = await auth.api.getSession({
    headers: await headers(),
  });

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

  return (
    <SettingsTabs orgId={orgId} showBrowserTab={isWebAutomationsEnabled}>
      {children}
    </SettingsTabs>
  );
}
