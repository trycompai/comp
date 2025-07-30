'use server';

import { encrypt } from '@/lib/encryption';
import { db } from '@db';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { authActionClient } from '../safe-action';

export const updateIntegrationSettingsAction = authActionClient
  .inputSchema(
    z.object({
      integration_id: z.string(),
      option: z.object({
        id: z.string(),
        value: z.unknown(),
      }),
    }),
  )
  .metadata({
    name: 'update-integration-settings',
    track: {
      event: 'update-integration-settings',
      channel: 'update-integration-settings',
    },
  })
  .action(async ({ parsedInput: { integration_id, option }, ctx: { session } }) => {
    try {
      if (!session.activeOrganizationId) {
        throw new Error('User organization not found');
      }

      let existingIntegration = await db.integration.findFirst({
        where: {
          name: integration_id,
          organizationId: session.activeOrganizationId,
        },
      });

      if (!existingIntegration) {
        existingIntegration = await db.integration.create({
          data: {
            name: integration_id,
            organizationId: session.activeOrganizationId,
            userSettings: {},
            integrationId: integration_id,
            settings: {},
          },
        });
      }

      const userSettings = existingIntegration.userSettings;

      if (!userSettings) {
        throw new Error('User settings not found');
      }

      const updatedUserSettings = {
        ...(userSettings as Record<string, unknown>),
        [option.id]: option.value,
      };

      const parsedUserSettings = JSON.parse(JSON.stringify(updatedUserSettings));

      const encryptedSettings = await Promise.all(
        Object.entries(parsedUserSettings).map(async ([key, value]) => {
          if (typeof value === 'string') {
            const encrypted = await encrypt(value);
            return [key, encrypted];
          }
          return [key, value];
        }),
      ).then(Object.fromEntries);

      await db.integration.update({
        where: {
          id: existingIntegration.id,
        },
        data: {
          userSettings: encryptedSettings,
        },
      });

      revalidatePath('/integrations');

      return { success: true };
    } catch (error) {
      console.error('Failed to update integration settings:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update integration settings',
      };
    }
  });
