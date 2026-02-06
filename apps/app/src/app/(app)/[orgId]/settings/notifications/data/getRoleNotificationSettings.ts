import { db } from '@db';

export const NOTIFICATION_TYPES = [
  {
    key: 'policyNotifications' as const,
    label: 'Policy Updates',
    description: 'When policies are published or updated',
  },
  {
    key: 'taskReminders' as const,
    label: 'Task Reminders',
    description: 'Due date and overdue reminders',
  },
  {
    key: 'taskAssignments' as const,
    label: 'Task Assignments',
    description: 'When tasks are assigned to users',
  },
  {
    key: 'taskMentions' as const,
    label: 'Mentions',
    description: 'When someone mentions a user in a task or comment',
  },
  {
    key: 'weeklyTaskDigest' as const,
    label: 'Weekly Digest',
    description: 'Weekly summary of pending tasks',
  },
  {
    key: 'findingNotifications' as const,
    label: 'Finding Updates',
    description: 'When audit findings are created or updated',
  },
] as const;

export type NotificationKey = (typeof NOTIFICATION_TYPES)[number]['key'];

export const BUILT_IN_ROLES = [
  'owner',
  'admin',
  'auditor',
  'employee',
  'contractor',
] as const;

// Default notification config for built-in roles when no settings exist
const BUILT_IN_DEFAULTS: Record<string, Record<NotificationKey, boolean>> = {
  owner: {
    policyNotifications: true,
    taskReminders: true,
    taskAssignments: true,
    taskMentions: true,
    weeklyTaskDigest: true,
    findingNotifications: true,
  },
  admin: {
    policyNotifications: true,
    taskReminders: true,
    taskAssignments: true,
    taskMentions: true,
    weeklyTaskDigest: true,
    findingNotifications: true,
  },
  auditor: {
    policyNotifications: true,
    taskReminders: false,
    taskAssignments: false,
    taskMentions: false,
    weeklyTaskDigest: false,
    findingNotifications: true,
  },
  employee: {
    policyNotifications: true,
    taskReminders: true,
    taskAssignments: true,
    taskMentions: true,
    weeklyTaskDigest: true,
    findingNotifications: false,
  },
  contractor: {
    policyNotifications: true,
    taskReminders: true,
    taskAssignments: true,
    taskMentions: true,
    weeklyTaskDigest: false,
    findingNotifications: false,
  },
};

const ALL_ON: Record<NotificationKey, boolean> = {
  policyNotifications: true,
  taskReminders: true,
  taskAssignments: true,
  taskMentions: true,
  weeklyTaskDigest: true,
  findingNotifications: true,
};

export interface RoleNotificationConfig {
  role: string;
  label: string;
  isCustom: boolean;
  notifications: Record<NotificationKey, boolean>;
}

export async function getRoleNotificationSettings(
  organizationId: string,
): Promise<RoleNotificationConfig[]> {
  const [savedSettings, customRoles] = await Promise.all([
    db.roleNotificationSetting.findMany({
      where: { organizationId },
    }),
    db.organizationRole.findMany({
      where: { organizationId },
      select: { name: true },
    }),
  ]);

  const settingsMap = new Map(savedSettings.map((s) => [s.role, s]));

  const configs: RoleNotificationConfig[] = [];

  // Built-in roles
  for (const role of BUILT_IN_ROLES) {
    const saved = settingsMap.get(role);
    const defaults = BUILT_IN_DEFAULTS[role];

    configs.push({
      role,
      label: role.charAt(0).toUpperCase() + role.slice(1),
      isCustom: false,
      notifications: saved
        ? {
            policyNotifications: saved.policyNotifications,
            taskReminders: saved.taskReminders,
            taskAssignments: saved.taskAssignments,
            taskMentions: saved.taskMentions,
            weeklyTaskDigest: saved.weeklyTaskDigest,
            findingNotifications: saved.findingNotifications,
          }
        : defaults,
    });
  }

  // Custom roles
  for (const customRole of customRoles) {
    const saved = settingsMap.get(customRole.name);

    configs.push({
      role: customRole.name,
      label: customRole.name,
      isCustom: true,
      notifications: saved
        ? {
            policyNotifications: saved.policyNotifications,
            taskReminders: saved.taskReminders,
            taskAssignments: saved.taskAssignments,
            taskMentions: saved.taskMentions,
            weeklyTaskDigest: saved.weeklyTaskDigest,
            findingNotifications: saved.findingNotifications,
          }
        : ALL_ON,
    });
  }

  return configs;
}
