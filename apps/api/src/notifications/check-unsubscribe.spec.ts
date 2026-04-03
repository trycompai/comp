import { isUserUnsubscribed } from '@trycompai/email';
import type { EmailPreferenceType } from '@trycompai/email';

/**
 * Helper to build a mock db object for isUserUnsubscribed.
 * Only requires user.findUnique; member and roleNotificationSetting are optional.
 */
function createMockDb(overrides?: {
  user?: {
    emailNotificationsUnsubscribed: boolean;
    emailPreferences: unknown;
  } | null;
  members?: { role: string }[];
  roleSettings?: {
    policyNotifications: boolean;
    taskReminders: boolean;
    taskAssignments: boolean;
    taskMentions: boolean;
    weeklyTaskDigest: boolean;
    findingNotifications: boolean;
  }[];
}) {
  return {
    user: {
      findUnique: jest.fn().mockResolvedValue(
        overrides?.user === undefined
          ? {
              emailNotificationsUnsubscribed: false,
              emailPreferences: null,
            }
          : overrides.user,
      ),
    },
    member: {
      findMany: jest.fn().mockResolvedValue(overrides?.members ?? []),
    },
    roleNotificationSetting: {
      findMany: jest.fn().mockResolvedValue(overrides?.roleSettings ?? []),
    },
  };
}

const ALL_ON = {
  policyNotifications: true,
  taskReminders: true,
  taskAssignments: true,
  taskMentions: true,
  weeklyTaskDigest: true,
  findingNotifications: true,
};

const ALL_OFF = {
  policyNotifications: false,
  taskReminders: false,
  taskAssignments: false,
  taskMentions: false,
  weeklyTaskDigest: false,
  findingNotifications: false,
};

describe('isUserUnsubscribed', () => {
  const email = 'user@example.com';
  const orgId = 'org_123';

  // ---------------------------------------------------------------------------
  // Legacy behavior (no organizationId)
  // ---------------------------------------------------------------------------
  describe('legacy behavior (no organizationId)', () => {
    it('should return false when user is not found', async () => {
      const db = createMockDb({ user: null });

      const result = await isUserUnsubscribed(db, email, 'taskReminders');

      expect(result).toBe(false);
    });

    it('should return true when legacy unsubscribe flag is set', async () => {
      const db = createMockDb({
        user: {
          emailNotificationsUnsubscribed: true,
          emailPreferences: null,
        },
      });

      const result = await isUserUnsubscribed(db, email, 'taskReminders');

      expect(result).toBe(true);
    });

    it('should return true for any preference type when legacy flag is set', async () => {
      const db = createMockDb({
        user: {
          emailNotificationsUnsubscribed: true,
          emailPreferences: null,
        },
      });

      const types: EmailPreferenceType[] = [
        'policyNotifications',
        'taskReminders',
        'weeklyTaskDigest',
        'taskMentions',
        'taskAssignments',
        'findingNotifications',
      ];

      for (const type of types) {
        expect(await isUserUnsubscribed(db, email, type)).toBe(true);
      }
    });

    it('should return false when no preference type is specified and not unsubscribed', async () => {
      const db = createMockDb();

      const result = await isUserUnsubscribed(db, email);

      expect(result).toBe(false);
    });

    it('should return true when a specific preference is disabled', async () => {
      const db = createMockDb({
        user: {
          emailNotificationsUnsubscribed: false,
          emailPreferences: { taskReminders: false },
        },
      });

      const result = await isUserUnsubscribed(db, email, 'taskReminders');

      expect(result).toBe(true);
    });

    it('should return false when a specific preference is enabled', async () => {
      const db = createMockDb({
        user: {
          emailNotificationsUnsubscribed: false,
          emailPreferences: { taskReminders: true },
        },
      });

      const result = await isUserUnsubscribed(db, email, 'taskReminders');

      expect(result).toBe(false);
    });

    it('should default to enabled when no email preferences are stored', async () => {
      const db = createMockDb({
        user: {
          emailNotificationsUnsubscribed: false,
          emailPreferences: null,
        },
      });

      const result = await isUserUnsubscribed(db, email, 'policyNotifications');

      expect(result).toBe(false);
    });

    it('should merge stored preferences with defaults', async () => {
      const db = createMockDb({
        user: {
          emailNotificationsUnsubscribed: false,
          emailPreferences: { taskReminders: false },
          // policyNotifications not set — should default to true
        },
      });

      expect(await isUserUnsubscribed(db, email, 'taskReminders')).toBe(true);
      expect(await isUserUnsubscribed(db, email, 'policyNotifications')).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // Role-based behavior (with organizationId)
  // ---------------------------------------------------------------------------
  describe('role-based notification settings', () => {
    it('should return true when all roles disable the notification', async () => {
      const db = createMockDb({
        members: [{ role: 'employee' }],
        roleSettings: [{ ...ALL_OFF }],
      });

      const result = await isUserUnsubscribed(db, email, 'taskReminders', orgId);

      expect(result).toBe(true);
    });

    it('should return false when at least one role enables the notification (union)', async () => {
      const db = createMockDb({
        members: [{ role: 'auditor' }, { role: 'employee' }],
        roleSettings: [
          { ...ALL_OFF, taskReminders: false }, // auditor: OFF
          { ...ALL_OFF, taskReminders: true }, // employee: ON
        ],
      });

      const result = await isUserUnsubscribed(db, email, 'taskReminders', orgId);

      expect(result).toBe(false);
    });

    it('should honor existing personal opt-out for non-admin users when role says ON', async () => {
      const db = createMockDb({
        user: {
          emailNotificationsUnsubscribed: false,
          emailPreferences: { taskReminders: false }, // user previously opted out
        },
        members: [{ role: 'employee' }],
        roleSettings: [{ ...ALL_ON }], // role says ON
      });

      const result = await isUserUnsubscribed(db, email, 'taskReminders', orgId);

      expect(result).toBe(true); // existing opt-out is preserved
    });

    it('should not unsubscribe non-admin users who have no personal opt-out when role says ON', async () => {
      const db = createMockDb({
        user: {
          emailNotificationsUnsubscribed: false,
          emailPreferences: null, // no personal preferences set
        },
        members: [{ role: 'employee' }],
        roleSettings: [{ ...ALL_ON }], // role says ON
      });

      const result = await isUserUnsubscribed(db, email, 'taskReminders', orgId);

      expect(result).toBe(false); // defaults to enabled
    });

    it('should allow admin to opt out via personal preferences when role says ON', async () => {
      const db = createMockDb({
        user: {
          emailNotificationsUnsubscribed: false,
          emailPreferences: { taskReminders: false }, // admin opted out
        },
        members: [{ role: 'admin' }],
        roleSettings: [{ ...ALL_ON }], // role says ON
      });

      const result = await isUserUnsubscribed(db, email, 'taskReminders', orgId);

      expect(result).toBe(true); // admin can opt out
    });

    it('should allow owner to opt out via personal preferences when role says ON', async () => {
      const db = createMockDb({
        user: {
          emailNotificationsUnsubscribed: false,
          emailPreferences: { weeklyTaskDigest: false },
        },
        members: [{ role: 'owner' }],
        roleSettings: [{ ...ALL_ON }],
      });

      const result = await isUserUnsubscribed(db, email, 'weeklyTaskDigest', orgId);

      expect(result).toBe(true);
    });

    it('should fall through to personal preferences when no role settings exist', async () => {
      const db = createMockDb({
        user: {
          emailNotificationsUnsubscribed: false,
          emailPreferences: { taskReminders: false },
        },
        members: [{ role: 'employee' }],
        roleSettings: [], // no role settings configured
      });

      const result = await isUserUnsubscribed(db, email, 'taskReminders', orgId);

      expect(result).toBe(true); // falls through to personal pref
    });

    it('should fall through to personal preferences when no member records found', async () => {
      const db = createMockDb({
        user: {
          emailNotificationsUnsubscribed: false,
          emailPreferences: { taskReminders: false },
        },
        members: [], // user not a member of this org
        roleSettings: [],
      });

      const result = await isUserUnsubscribed(db, email, 'taskReminders', orgId);

      expect(result).toBe(true); // falls through to personal pref
    });

    it('should handle comma-separated roles on a single member record', async () => {
      const db = createMockDb({
        user: {
          emailNotificationsUnsubscribed: false,
          emailPreferences: null, // no personal opt-out
        },
        members: [{ role: 'auditor,employee' }],
        roleSettings: [
          { ...ALL_OFF, taskReminders: false }, // auditor: OFF
          { ...ALL_OFF, taskReminders: true }, // employee: ON
        ],
      });

      const result = await isUserUnsubscribed(db, email, 'taskReminders', orgId);

      expect(result).toBe(false); // employee role enables it, no personal opt-out
    });

    it('should treat comma-separated admin role as admin for opt-out', async () => {
      const db = createMockDb({
        user: {
          emailNotificationsUnsubscribed: false,
          emailPreferences: { taskReminders: false },
        },
        members: [{ role: 'admin,auditor' }],
        roleSettings: [{ ...ALL_ON }, { ...ALL_ON }],
      });

      const result = await isUserUnsubscribed(db, email, 'taskReminders', orgId);

      expect(result).toBe(true); // admin portion allows opt-out
    });

    it('should handle unassignedItemsNotifications without role-level setting', async () => {
      // unassignedItemsNotifications has no role-level mapping, so it should
      // always fall through to personal preferences regardless of org context
      const db = createMockDb({
        user: {
          emailNotificationsUnsubscribed: false,
          emailPreferences: { unassignedItemsNotifications: false },
        },
        members: [{ role: 'employee' }],
        roleSettings: [{ ...ALL_ON }],
      });

      const result = await isUserUnsubscribed(
        db,
        email,
        'unassignedItemsNotifications',
        orgId,
      );

      expect(result).toBe(true); // falls through to personal pref
    });

    it('should check each notification type independently', async () => {
      const db = createMockDb({
        members: [{ role: 'employee' }],
        roleSettings: [
          {
            policyNotifications: true,
            taskReminders: false,
            taskAssignments: true,
            taskMentions: false,
            weeklyTaskDigest: true,
            findingNotifications: false,
          },
        ],
      });

      // ON by role
      expect(await isUserUnsubscribed(db, email, 'policyNotifications', orgId)).toBe(false);
      expect(await isUserUnsubscribed(db, email, 'taskAssignments', orgId)).toBe(false);
      expect(await isUserUnsubscribed(db, email, 'weeklyTaskDigest', orgId)).toBe(false);

      // OFF by role
      expect(await isUserUnsubscribed(db, email, 'taskReminders', orgId)).toBe(true);
      expect(await isUserUnsubscribed(db, email, 'taskMentions', orgId)).toBe(true);
      expect(await isUserUnsubscribed(db, email, 'findingNotifications', orgId)).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Edge cases & error handling
  // ---------------------------------------------------------------------------
  describe('edge cases', () => {
    it('should return false when db.user.findUnique throws', async () => {
      const db = createMockDb();
      db.user.findUnique.mockRejectedValue(new Error('DB connection error'));

      const result = await isUserUnsubscribed(db, email, 'taskReminders');

      expect(result).toBe(false);
    });

    it('should work without member/roleNotificationSetting on db object', async () => {
      // When db doesn't have member or roleNotificationSetting (e.g., legacy callers)
      const db = {
        user: {
          findUnique: jest.fn().mockResolvedValue({
            emailNotificationsUnsubscribed: false,
            emailPreferences: { taskReminders: false },
          }),
        },
      };

      const result = await isUserUnsubscribed(db, email, 'taskReminders', orgId);

      // Should fall through to personal preferences since db.member is missing
      expect(result).toBe(true);
    });

    it('should return false on error during role lookup', async () => {
      const db = createMockDb();
      db.member.findMany.mockRejectedValue(new Error('Query failed'));

      const result = await isUserUnsubscribed(db, email, 'taskReminders', orgId);

      expect(result).toBe(false);
    });

    it('should handle emailPreferences that is not an object', async () => {
      const db = createMockDb({
        user: {
          emailNotificationsUnsubscribed: false,
          emailPreferences: 'invalid' as unknown,
        },
      });

      // Should use defaults (all true) since preferences is not an object
      const result = await isUserUnsubscribed(db, email, 'taskReminders');

      expect(result).toBe(false);
    });
  });
});
