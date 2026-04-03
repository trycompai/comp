import { serverApi } from '@/lib/api-server';
import type { Metadata } from 'next';
import { EmailNotificationPreferences } from './components/EmailNotificationPreferences';

export default async function UserSettings({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;

  const res = await serverApi.get<{
    email: string;
    preferences: {
      policyNotifications: boolean;
      taskReminders: boolean;
      weeklyTaskDigest: boolean;
      unassignedItemsNotifications: boolean;
      taskMentions: boolean;
      taskAssignments: boolean;
    };
    isAdminOrOwner: boolean;
    roleNotifications: {
      policyNotifications: boolean;
      taskReminders: boolean;
      taskAssignments: boolean;
      taskMentions: boolean;
      weeklyTaskDigest: boolean;
      findingNotifications: boolean;
    } | null;
  }>('/v1/people/me/email-preferences');

  if (!res.data?.email) {
    return null;
  }

  return (
    <EmailNotificationPreferences
      initialPreferences={res.data.preferences}
      email={res.data.email}
      isAdminOrOwner={res.data.isAdminOrOwner}
      roleNotifications={res.data.roleNotifications}
    />
  );
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'User Settings',
  };
}
