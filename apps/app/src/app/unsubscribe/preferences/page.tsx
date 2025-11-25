import { verifyUnsubscribeToken } from '@/lib/unsubscribe';
import { db } from '@db';
import { UnsubscribePreferencesClient, type EmailPreferences } from './client';

interface PageProps {
  searchParams: Promise<{ email?: string; token?: string }>;
}

const DEFAULT_PREFERENCES: EmailPreferences = {
  policyNotifications: true,
  taskReminders: true,
  weeklyTaskDigest: true,
  unassignedItemsNotifications: true,
};

async function fetchUserPreferences(
  email: string,
  token: string,
): Promise<{ error: string } | { preferences: EmailPreferences }> {
  if (!verifyUnsubscribeToken(email, token)) {
    return { error: 'Invalid token' };
  }

  const user = await db.user.findUnique({
    where: { email },
    select: { emailPreferences: true, emailNotificationsUnsubscribed: true },
  });

  if (!user) {
    return { error: 'User not found' };
  }

  // If user has the old all-or-nothing unsubscribe flag, convert to preferences
  if (user.emailNotificationsUnsubscribed) {
    return {
      preferences: {
        policyNotifications: false,
        taskReminders: false,
        weeklyTaskDigest: false,
        unassignedItemsNotifications: false,
      },
    };
  }

  // Return preferences or defaults
  const preferences =
    user.emailPreferences && typeof user.emailPreferences === 'object'
      ? { ...DEFAULT_PREFERENCES, ...(user.emailPreferences as Record<string, boolean>) }
      : DEFAULT_PREFERENCES;

  return { preferences };
}

export default async function UnsubscribePreferencesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { email, token } = params;

  if (!email || !token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
          <div className="text-center text-red-600">Email and token are required</div>
        </div>
      </div>
    );
  }

  const result = await fetchUserPreferences(email, token);

  if ('error' in result) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
          <div className="text-center text-red-600">{result.error}</div>
        </div>
      </div>
    );
  }

  return (
    <UnsubscribePreferencesClient
      email={email}
      token={token}
      initialPreferences={result.preferences}
    />
  );
}
