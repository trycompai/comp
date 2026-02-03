import { auth } from '@/utils/auth';
import { db } from '@db';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { EmailNotificationPreferences } from './components/EmailNotificationPreferences';

export default async function UserSettings({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.email) {
    return null;
  }

  // Fetch user data and member role in parallel
  const [user, member] = await Promise.all([
    db.user.findUnique({
      where: { email: session.user.email },
      select: {
        emailPreferences: true,
        emailNotificationsUnsubscribed: true,
      },
    }),
    db.member.findFirst({
      where: {
        organizationId: orgId,
        user: { email: session.user.email },
        deactivated: false,
      },
      select: { role: true },
    }),
  ]);

  const DEFAULT_PREFERENCES = {
    policyNotifications: true,
    taskReminders: true,
    weeklyTaskDigest: true,
    unassignedItemsNotifications: true,
    taskMentions: true,
    taskAssignments: true,
  };

  // Determine user's roles and admin status
  const userRoles = member?.role.split(',').map((r) => r.trim()) ?? [];
  const isAdminOrOwner = userRoles.some(
    (r) => r === 'owner' || r === 'admin',
  );

  // Fetch role notification settings for non-admin users
  let roleNotifications: {
    policyNotifications: boolean;
    taskReminders: boolean;
    taskAssignments: boolean;
    taskMentions: boolean;
    weeklyTaskDigest: boolean;
    findingNotifications: boolean;
  } | null = null;

  if (!isAdminOrOwner && userRoles.length > 0) {
    const roleSettings = await db.roleNotificationSetting.findMany({
      where: {
        organizationId: orgId,
        role: { in: userRoles },
      },
    });

    if (roleSettings.length > 0) {
      // Union: if ANY role enables a notification, it's enabled
      roleNotifications = {
        policyNotifications: roleSettings.some(
          (s) => s.policyNotifications,
        ),
        taskReminders: roleSettings.some((s) => s.taskReminders),
        taskAssignments: roleSettings.some((s) => s.taskAssignments),
        taskMentions: roleSettings.some((s) => s.taskMentions),
        weeklyTaskDigest: roleSettings.some((s) => s.weeklyTaskDigest),
        findingNotifications: roleSettings.some(
          (s) => s.findingNotifications,
        ),
      };
    }
  }

  // If user has the old all-or-nothing unsubscribe flag, convert to preferences
  if (user?.emailNotificationsUnsubscribed) {
    const preferences = {
      policyNotifications: false,
      taskReminders: false,
      weeklyTaskDigest: false,
      unassignedItemsNotifications: false,
      taskMentions: false,
      taskAssignments: false,
    };
    return (
      <EmailNotificationPreferences
        initialPreferences={preferences}
        email={session.user.email}
        isAdminOrOwner={isAdminOrOwner}
        roleNotifications={roleNotifications}
      />
    );
  }

  const preferences =
    user?.emailPreferences && typeof user.emailPreferences === 'object'
      ? {
          ...DEFAULT_PREFERENCES,
          ...(user.emailPreferences as Record<string, boolean>),
        }
      : DEFAULT_PREFERENCES;

  return (
    <EmailNotificationPreferences
      initialPreferences={preferences}
      email={session.user.email}
      isAdminOrOwner={isAdminOrOwner}
      roleNotifications={roleNotifications}
    />
  );
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'User Settings',
  };
}
