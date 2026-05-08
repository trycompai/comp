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

// Portal-only roles should not receive app notifications by default.
// When no role_notification_setting DB record exists, these defaults apply.
const PORTAL_ONLY_ROLES = new Set(['employee', 'contractor']);
const PORTAL_ONLY_DEFAULTS: RoleNotificationRecord = {
  policyNotifications: true,
  taskReminders: false,
  taskAssignments: false,
  taskMentions: false,
  weeklyTaskDigest: false,
  findingNotifications: false,
};

export interface RoleNotificationRecord {
  policyNotifications: boolean;
  taskReminders: boolean;
  taskAssignments: boolean;
  taskMentions: boolean;
  weeklyTaskDigest: boolean;
  findingNotifications: boolean;
}

/**
 * Batch version of isUserUnsubscribed.
 *
 * Given a list of email addresses, returns the set of emails that are
 * unsubscribed from the given preferenceType in the given org.
 *
 * Uses 3 DB queries total (regardless of list size) instead of up to 3N.
 * Fail-open: on any error, returns an empty set so all emails are sent.
 */
export async function getUnsubscribedEmails(
  db: {
    user: {
      findMany: (args: {
        where: { email: { in: string[] } };
        select: {
          email: boolean;
          emailNotificationsUnsubscribed: boolean;
          emailPreferences: boolean;
          role: boolean;
        };
      }) => Promise<
        Array<{
          email: string;
          emailNotificationsUnsubscribed: boolean;
          emailPreferences: unknown;
          role: string | null;
        }>
      >;
    };
    member: {
      findMany: (args: {
        where: {
          organizationId: string;
          deactivated: boolean;
          user: { email: { in: string[] } };
        };
        select: { role: boolean; user: { select: { email: boolean } } };
      }) => Promise<Array<{ role: string; user: { email: string } }>>;
    };
    roleNotificationSetting: {
      findMany: (args: {
        where: { organizationId: string };
      }) => Promise<Array<{ role: string } & RoleNotificationRecord>>;
    };
  },
  emails: string[],
  preferenceType: EmailPreferenceType,
  organizationId: string,
): Promise<Set<string>> {
  try {
    if (emails.length === 0) return new Set();

    const users = await db.user.findMany({
      where: { email: { in: emails } },
      select: {
        email: true,
        emailNotificationsUnsubscribed: true,
        emailPreferences: true,
        role: true,
      },
    });

    const unsubscribed = new Set<string>();

    // Step 1: filter out platform admins and legacy all-or-nothing unsubscribes
    const survivingUsers: typeof users = [];
    for (const user of users) {
      if (user.role === 'admin' || user.emailNotificationsUnsubscribed) {
        unsubscribed.add(user.email);
      } else {
        survivingUsers.push(user);
      }
    }

    if (survivingUsers.length === 0) return unsubscribed;

    const survivingEmails = survivingUsers.map((u) => u.email);

    // Step 2: look up org roles for all surviving users in one query
    const memberRecords = await db.member.findMany({
      where: {
        organizationId,
        deactivated: false,
        user: { email: { in: survivingEmails } },
      },
      select: { role: true, user: { select: { email: true } } },
    });

    const rolesByEmail = new Map<string, string[]>();
    for (const m of memberRecords) {
      const existing = rolesByEmail.get(m.user.email) ?? [];
      const roles = m.role.split(',').map((r) => r.trim());
      rolesByEmail.set(m.user.email, [...existing, ...roles]);
    }

    // Step 3: fetch all role notification settings for the org in one query
    const allRoleSettings = await db.roleNotificationSetting.findMany({
      where: { organizationId },
    });
    const roleSettingsByRole = new Map<string, RoleNotificationRecord>();
    for (const s of allRoleSettings) {
      roleSettingsByRole.set(s.role, s);
    }

    const roleSettingField = ROLE_SETTING_FIELDS[preferenceType];

    // Step 4: apply the same resolution logic as isUserUnsubscribed per user
    for (const user of survivingUsers) {
      const userRoles = rolesByEmail.get(user.email);

      if (roleSettingField && userRoles && userRoles.length > 0) {
        const matchingSettings = userRoles
          .map((r) => roleSettingsByRole.get(r))
          .filter((s): s is RoleNotificationRecord => s !== undefined);

        if (matchingSettings.length > 0) {
          const enabledByRole = matchingSettings.some(
            (s) => s[roleSettingField as keyof RoleNotificationRecord],
          );
          if (!enabledByRole) {
            // All roles say OFF — unsubscribed regardless of personal prefs
            unsubscribed.add(user.email);
            continue;
          }
          // Role says ON — fall through to personal preferences
        } else {
          // No DB records — use built-in defaults for portal-only roles
          const allPortalOnly = userRoles.every((r) => PORTAL_ONLY_ROLES.has(r));
          if (allPortalOnly) {
            const enabled =
              PORTAL_ONLY_DEFAULTS[roleSettingField as keyof RoleNotificationRecord];
            if (!enabled) {
              unsubscribed.add(user.email);
              continue;
            }
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

      if (preferences[preferenceType] === false) {
        unsubscribed.add(user.email);
      }
    }

    return unsubscribed;
  } catch (error) {
    console.error('Error checking unsubscribe status (batch):', error);
    return new Set();
  }
}

/**
 * Check if a user is unsubscribed from a specific type of email notification.
 *
 * Resolution order (when organizationId is provided):
 * 1. Legacy all-or-nothing flag — if set, user is unsubscribed from everything.
 * 2. Check role notification settings for the user's roles in the org.
 *    - If ALL roles disable this notification, the user is unsubscribed (no override).
 *    - If ANY role enables it, fall through to personal preferences.
 *    - If no role settings are configured, portal-only roles (employee/contractor)
 *      use built-in defaults; other roles fall through to personal preferences.
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
          role: boolean;
        };
      }) => Promise<{
        emailNotificationsUnsubscribed: boolean;
        emailPreferences: unknown;
        role: string | null;
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
        role: true,
      },
    });

    if (!user) {
      return false;
    }

    // Platform admins never receive email notifications
    if (user.role === 'admin') {
      return true;
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
        } else {
          // No DB records — use built-in defaults for portal-only roles
          const allPortalOnly = userRoles.every((r) =>
            PORTAL_ONLY_ROLES.has(r),
          );
          if (allPortalOnly) {
            const enabled =
              PORTAL_ONLY_DEFAULTS[
                roleSettingField as keyof RoleNotificationRecord
              ];
            if (!enabled) {
              return true;
            }
          }
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
