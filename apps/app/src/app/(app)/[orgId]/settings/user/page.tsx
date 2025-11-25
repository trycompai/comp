import { auth } from '@/utils/auth';
import { db } from '@db';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { EmailNotificationPreferences } from './components/EmailNotificationPreferences';

export default async function UserSettings() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.email) {
    return null;
  }

  const user = await db.user.findUnique({
    where: { email: session.user.email },
    select: {
      emailPreferences: true,
      emailNotificationsUnsubscribed: true,
    },
  });

  const DEFAULT_PREFERENCES = {
    policyNotifications: true,
    taskReminders: true,
    weeklyTaskDigest: true,
    unassignedItemsNotifications: true,
  };

  // If user has the old all-or-nothing unsubscribe flag, convert to preferences
  if (user?.emailNotificationsUnsubscribed) {
    const preferences = {
      policyNotifications: false,
      taskReminders: false,
      weeklyTaskDigest: false,
      unassignedItemsNotifications: false,
    };
    return (
      <div className="space-y-4">
        <EmailNotificationPreferences initialPreferences={preferences} email={session.user.email} />
      </div>
    );
  }

  const preferences =
    user?.emailPreferences && typeof user.emailPreferences === 'object'
      ? { ...DEFAULT_PREFERENCES, ...(user.emailPreferences as Record<string, boolean>) }
      : DEFAULT_PREFERENCES;

  return (
    <div className="space-y-4">
      <EmailNotificationPreferences initialPreferences={preferences} email={session.user.email} />
    </div>
  );
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'User Settings',
  };
}
