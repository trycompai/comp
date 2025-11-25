'use server';

import { authActionClient } from '@/actions/safe-action';
import { db } from '@db';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const emailPreferencesSchema = z.object({
  preferences: z.object({
    policyNotifications: z.boolean(),
    taskReminders: z.boolean(),
    weeklyTaskDigest: z.boolean(),
    unassignedItemsNotifications: z.boolean(),
  }),
});

export const updateEmailPreferencesAction = authActionClient
  .inputSchema(emailPreferencesSchema)
  .metadata({
    name: 'update-email-preferences',
    track: {
      event: 'update-email-preferences',
      description: 'Update Email Preferences',
      channel: 'server',
    },
  })
  .action(async ({ ctx, parsedInput }) => {
    const { user } = ctx;

    if (!user?.email) {
      return {
        success: false,
        error: 'Not authorized',
      };
    }

    try {
      const { preferences } = parsedInput;

      // Check if all preferences are disabled
      const allUnsubscribed = Object.values(preferences).every((v) => v === false);

      await db.user.update({
        where: { email: user.email },
        data: {
          emailPreferences: preferences,
          emailNotificationsUnsubscribed: allUnsubscribed,
        },
      });

      // Revalidate the settings page
      if (ctx.session.activeOrganizationId) {
        revalidatePath(`/${ctx.session.activeOrganizationId}/settings/user`);
      }

      return {
        success: true,
      };
    } catch (error) {
      console.error('Error updating email preferences:', error);
      return {
        success: false,
        error: 'Failed to update email preferences',
      };
    }
  });
