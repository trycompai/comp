'use server';

import { db } from '@db';
import { verifyUnsubscribeToken } from '@/lib/unsubscribe';
import { createSafeActionClient } from 'next-safe-action';
import { z } from 'zod';
import type { EmailPreferences } from '../client';

const updatePreferencesSchema = z.object({
  email: z.string().email(),
  token: z.string(),
  preferences: z.object({
    policyNotifications: z.boolean(),
    taskReminders: z.boolean(),
    weeklyTaskDigest: z.boolean(),
    unassignedItemsNotifications: z.boolean(),
  }),
});

export const updateUnsubscribePreferencesAction = createSafeActionClient()
  .inputSchema(updatePreferencesSchema)
  .action(async ({ parsedInput }) => {
    const { email, token, preferences } = parsedInput;

    if (!verifyUnsubscribeToken(email, token)) {
      return {
        success: false as const,
        error: 'Invalid token',
      };
    }

    const user = await db.user.findUnique({
      where: { email },
    });

    if (!user) {
      return {
        success: false as const,
        error: 'User not found',
      };
    }

    try {
      // Check if all preferences are disabled
      const allUnsubscribed = Object.values(preferences).every((v) => v === false);

      await db.user.update({
        where: { email },
        data: {
          emailPreferences: preferences,
          emailNotificationsUnsubscribed: allUnsubscribed,
        },
      });

      return {
        success: true as const,
        data: preferences,
      };
    } catch (error) {
      console.error('Error updating unsubscribe preferences:', error);
      return {
        success: false as const,
        error: 'Failed to update preferences',
      };
    }
  });

