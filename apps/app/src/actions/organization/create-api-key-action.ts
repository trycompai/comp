'use server';

import { authActionClient } from '@/actions/safe-action';
import { apiKeySchema } from '@/actions/schema';
import { generateApiKey, generateSalt, hashApiKey } from '@/lib/api-key';
import { db } from '@db';
import { revalidatePath } from 'next/cache';

export const createApiKeyAction = authActionClient
  .inputSchema(apiKeySchema)
  .metadata({
    name: 'createApiKey',
    track: {
      event: 'createApiKey',
      channel: 'server',
    },
  })
  .action(async ({ parsedInput, ctx }) => {
    try {
      const { name, expiresAt } = parsedInput;
      console.log(`Creating API key "${name}" with expiration: ${expiresAt}`);

      // Generate a new API key and salt
      const apiKey = generateApiKey();
      const salt = generateSalt();
      const hashedKey = hashApiKey(apiKey, salt);
      console.log(`Generated new API key for organization: ${ctx.session.activeOrganizationId}`);

      // Parse the expiration date
      let expirationDate: Date | null = null;
      if (expiresAt && expiresAt !== 'never') {
        const now = new Date();
        switch (expiresAt) {
          case '30days':
            expirationDate = new Date(now.setDate(now.getDate() + 30));
            break;
          case '90days':
            expirationDate = new Date(now.setDate(now.getDate() + 90));
            break;
          case '1year':
            expirationDate = new Date(now.setFullYear(now.getFullYear() + 1));
            break;
        }
        console.log(`Set expiration date to: ${expirationDate?.toISOString()}`);
      } else {
        console.log('No expiration date set for API key');
      }

      // Create the API key in the database
      const apiKeyRecord = await db.apiKey.create({
        data: {
          name,
          key: hashedKey,
          salt, // Store the salt with the hashed key
          expiresAt: expirationDate,
          organizationId: ctx.session.activeOrganizationId!,
        },
        select: {
          id: true,
          name: true,
          createdAt: true,
          expiresAt: true,
        },
      });
      console.log(`Successfully created API key with ID: ${apiKeyRecord.id}`);

      revalidatePath(`/${ctx.session.activeOrganizationId}/settings/api-keys`);

      return {
        success: true,
        data: {
          ...apiKeyRecord,
          key: apiKey,
          createdAt: apiKeyRecord.createdAt.toISOString(),
          expiresAt: apiKeyRecord.expiresAt ? apiKeyRecord.expiresAt.toISOString() : null,
        },
      };
    } catch (error) {
      console.error('Error creating API key:', error);

      // Provide more specific error messages based on error type
      if (error instanceof Error) {
        console.error(`Error details: ${error.message}`);

        if (error.message.includes('Unique constraint')) {
          return {
            success: false,
            error: {
              code: 'DUPLICATE_NAME',
              message: 'An API key with this name already exists',
            },
          };
        }

        if (error.message.includes('Foreign key constraint')) {
          return {
            success: false,
            error: {
              code: 'INVALID_ORGANIZATION',
              message: "The organization does not exist or you don't have access",
            },
          };
        }
      }

      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred while creating the API key',
        },
      };
    }
  });
