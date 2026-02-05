const DEFAULT_PREFERENCES = {
  policyNotifications: true,
  taskReminders: true,
  weeklyTaskDigest: true,
  unassignedItemsNotifications: true,
  taskMentions: true,
  taskAssignments: true,
  findingNotifications: true,
};

export type EmailPreferenceType =
  | 'policyNotifications'
  | 'taskReminders'
  | 'weeklyTaskDigest'
  | 'unassignedItemsNotifications'
  | 'taskMentions'
  | 'taskAssignments'
  | 'findingNotifications';

// Maps EmailPreferenceType to RoleNotificationSetting field names
const ROLE_SETTING_FIELDS: Partial<Record<EmailPreferenceType, string>> = {
  policyNotifications: 'policyNotifications',
  taskReminders: 'taskReminders',
  taskAssignments: 'taskAssignments',
  taskMentions: 'taskMentions',
  weeklyTaskDigest: 'weeklyTaskDigest',
  findingNotifications: 'findingNotifications',
  // unassignedItemsNotifications has no role-level setting
};

const ADMIN_ROLES = new Set(['owner', 'admin']);

interface RoleNotificationRecord {
  policyNotifications: boolean;
  taskReminders: boolean;
  taskAssignments: boolean;
  taskMentions: boolean;
  weeklyTaskDigest: boolean;
  findingNotifications: boolean;
}

/**
 * Check if a user is unsubscribed from a specific type of email notification.
 *
 * Resolution order (when organizationId is provided):
 * 1. Legacy all-or-nothing flag — if set, user is unsubscribed from everything.
 * 2. Check role notification settings for the user's roles in the org.
 *    - If ALL roles disable this notification, the user is unsubscribed (no override).
 *    - If ANY role enables it, fall through to personal preferences.
 *    - If no role settings are configured, fall through to personal preferences.
 * 3. Check personal preferences — any user who previously opted out stays opted out.
 *    Owners/admins can toggle freely; non-admin users see these as read-only in the UI
 *    but their existing opt-outs are still honored so we don't re-subscribe people.
 *
 * Without organizationId: falls back to legacy personal preference behavior.
 */
export async function isUserUnsubscribed(
  db: {
    user: {
      findUnique: (args: {
        where: { email: string };
        select: {
          emailNotificationsUnsubscribed: boolean;
          emailPreferences: boolean;
          isPlatformAdmin: boolean;
        };
      }) => Promise<{
        emailNotificationsUnsubscribed: boolean;
        emailPreferences: unknown;
        isPlatformAdmin: boolean;
      } | null>;
    };
    member?: {
      findMany: (args: {
        where: {
          organizationId: string;
          user: { email: string };
          deactivated: boolean;
        };
        select: { role: boolean };
      }) => Promise<{ role: string }[]>;
    };
    roleNotificationSetting?: {
      findMany: (args: {
        where: { organizationId: string; role: { in: string[] } };
      }) => Promise<RoleNotificationRecord[]>;
    };
  },
  email: string,
  preferenceType?: EmailPreferenceType,
  organizationId?: string,
): Promise<boolean> {
  try {
    const user = await db.user.findUnique({
      where: { email },
      select: {
        emailNotificationsUnsubscribed: true,
        emailPreferences: true,
        isPlatformAdmin: true,
      },
    });

    if (!user) {
      return false;
    }

    // Platform admins only receive notifications for organizations they own
    if (user.isPlatformAdmin) {
      if (!organizationId || !db.member) {
        return true; // No org context — block notifications
      }
      const adminMemberRecords = await db.member.findMany({
        where: {
          organizationId,
          user: { email },
          deactivated: false,
        },
        select: { role: true },
      });
      const adminRoles = adminMemberRecords.flatMap((m) =>
        m.role.split(',').map((r) => r.trim()),
      );
      if (!adminRoles.includes('owner')) {
        return true; // Not an owner in this org — block notifications
      }
      // Platform admin IS an owner — fall through to normal notification logic
    }

    // If legacy all-or-nothing flag is set, user is unsubscribed from everything
    if (user.emailNotificationsUnsubscribed) {
      return true;
    }

    // If no preference type specified, check the legacy flag only
    if (!preferenceType) {
      return user.emailNotificationsUnsubscribed ?? false;
    }

    // Check role-based notification settings if organizationId is provided
    const roleSettingField = ROLE_SETTING_FIELDS[preferenceType];
    if (
      organizationId &&
      roleSettingField &&
      db.member &&
      db.roleNotificationSetting
    ) {
      // Look up the user's roles in this organization
      const memberRecords = await db.member.findMany({
        where: {
          organizationId,
          user: { email },
          deactivated: false,
        },
        select: { role: true },
      });

      if (memberRecords.length > 0) {
        // Roles can be comma-separated (e.g., "admin,auditor")
        const userRoles = memberRecords.flatMap((m) =>
          m.role.split(',').map((r) => r.trim()),
        );

        const roleSettings =
          await db.roleNotificationSetting.findMany({
            where: {
              organizationId,
              role: { in: userRoles },
            },
          });

        if (roleSettings.length > 0) {
          // Union: if ANY role enables this notification, it's ON
          const enabledByRole = roleSettings.some(
            (s) => s[roleSettingField as keyof RoleNotificationRecord],
          );

          if (!enabledByRole) {
            // All roles say OFF — user is unsubscribed regardless
            return true;
          }

          // Role says ON — fall through to personal preferences.
          // This ensures users who previously opted out stay opted out,
          // even if their role matrix now enables the notification.
        }
      }
    }

    // Check personal preference — overrides the role matrix for any user
    const preferences =
      user.emailPreferences && typeof user.emailPreferences === 'object'
        ? {
            ...DEFAULT_PREFERENCES,
            ...(user.emailPreferences as Record<string, boolean>),
          }
        : DEFAULT_PREFERENCES;

    return preferences[preferenceType] === false;
  } catch (error) {
    console.error('Error checking unsubscribe status:', error);
    return false;
  }
}
