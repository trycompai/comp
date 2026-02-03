'use server';

import { authActionClient } from '@/actions/safe-action';
import { db } from '@db';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const notificationSettingsSchema = z.object({
  settings: z.array(
    z.object({
      role: z.string(),
      policyNotifications: z.boolean(),
      taskReminders: z.boolean(),
      taskAssignments: z.boolean(),
      taskMentions: z.boolean(),
      weeklyTaskDigest: z.boolean(),
      findingNotifications: z.boolean(),
    }),
  ),
});

export const updateRoleNotificationsAction = authActionClient
  .inputSchema(notificationSettingsSchema)
  .metadata({
    name: 'update-role-notifications',
    track: {
      event: 'update-role-notifications',
      description: 'Update role notification settings',
      channel: 'server',
    },
  })
  .action(async ({ ctx, parsedInput }) => {
    const organizationId = ctx.session.activeOrganizationId;

    if (!organizationId) {
      return { success: false, error: 'No active organization' };
    }

    // Check if user is admin/owner
    const member = await db.member.findFirst({
      where: {
        organizationId,
        userId: ctx.user?.id,
        deactivated: false,
      },
      select: { role: true },
    });

    if (
      !member ||
      (!member.role.includes('admin') && !member.role.includes('owner'))
    ) {
      return {
        success: false,
        error: 'Only admins and owners can manage notification settings',
      };
    }

    try {
      const { settings } = parsedInput;

      // Upsert all role notification settings
      await Promise.all(
        settings.map((setting) =>
          db.roleNotificationSetting.upsert({
            where: {
              organizationId_role: {
                organizationId,
                role: setting.role,
              },
            },
            create: {
              organizationId,
              role: setting.role,
              policyNotifications: setting.policyNotifications,
              taskReminders: setting.taskReminders,
              taskAssignments: setting.taskAssignments,
              taskMentions: setting.taskMentions,
              weeklyTaskDigest: setting.weeklyTaskDigest,
              findingNotifications: setting.findingNotifications,
            },
            update: {
              policyNotifications: setting.policyNotifications,
              taskReminders: setting.taskReminders,
              taskAssignments: setting.taskAssignments,
              taskMentions: setting.taskMentions,
              weeklyTaskDigest: setting.weeklyTaskDigest,
              findingNotifications: setting.findingNotifications,
            },
          }),
        ),
      );

      revalidatePath(`/${organizationId}/settings/notifications`);

      return { success: true };
    } catch (error) {
      console.error('Error updating role notification settings:', error);
      return {
        success: false,
        error: 'Failed to update notification settings',
      };
    }
  });
