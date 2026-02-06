import { requireRoutePermission } from '@/lib/permissions.server';
import type { Metadata } from 'next';
import { RoleNotificationSettings } from './components/RoleNotificationSettings';
import { getRoleNotificationSettings } from './data/getRoleNotificationSettings';

export default async function NotificationsSettings({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;

  await requireRoutePermission('settings/notifications', orgId);

  const settings = await getRoleNotificationSettings(orgId);

  return <RoleNotificationSettings initialSettings={settings} />;
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Notification Settings',
  };
}
