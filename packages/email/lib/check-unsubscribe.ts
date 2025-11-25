const DEFAULT_PREFERENCES = {
  policyNotifications: true,
  taskReminders: true,
  weeklyTaskDigest: true,
  unassignedItemsNotifications: true,
};

type EmailPreferenceType = 'policyNotifications' | 'taskReminders' | 'weeklyTaskDigest' | 'unassignedItemsNotifications';

/**
 * Helper function to check if a user is unsubscribed from a specific type of email notification
 * This should be called before sending any notification/reminder emails
 * 
 * @param db - Prisma database client
 * @param email - User's email address
 * @param preferenceType - Type of email preference to check
 * @returns true if user is unsubscribed from this type, false otherwise
 */
export async function isUserUnsubscribed(
  db: {
    user: {
      findUnique: (args: {
        where: { email: string };
        select: { emailNotificationsUnsubscribed: boolean; emailPreferences: boolean };
      }) => Promise<{ emailNotificationsUnsubscribed: boolean; emailPreferences: unknown } | null>;
    };
  },
  email: string,
  preferenceType?: EmailPreferenceType,
): Promise<boolean> {
  try {
    const user = await db.user.findUnique({
      where: { email },
      select: { emailNotificationsUnsubscribed: true, emailPreferences: true },
    });

    if (!user) {
      return false;
    }

    // If legacy all-or-nothing flag is set, user is unsubscribed from everything
    if (user.emailNotificationsUnsubscribed) {
      return true;
    }

    // If no preference type specified, check the legacy flag
    if (!preferenceType) {
      return user.emailNotificationsUnsubscribed ?? false;
    }

    // Check specific preference
    const preferences =
      user.emailPreferences && typeof user.emailPreferences === 'object'
        ? { ...DEFAULT_PREFERENCES, ...(user.emailPreferences as Record<string, boolean>) }
        : DEFAULT_PREFERENCES;

    // Return true if this specific preference is disabled
    return preferences[preferenceType] === false;
  } catch (error) {
    console.error('Error checking unsubscribe status:', error);
    // If there's an error, default to not unsubscribed to avoid blocking legitimate emails
    return false;
  }
}

