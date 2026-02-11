import { serverApi } from '@/lib/api-server';
import type { Metadata } from 'next';
import { RoleNotificationSettings } from './components/RoleNotificationSettings';
import type { RoleNotificationConfig } from './data/getRoleNotificationSettings';

export default async function NotificationsSettings({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;

  const res = await serverApi.get<{
    data: RoleNotificationConfig[];
  }>('/v1/organization/role-notifications');

  const settings = res.data?.data ?? [];

  return <RoleNotificationSettings initialSettings={settings} />;
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Notification Settings',
  };
}
