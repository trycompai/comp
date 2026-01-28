'use server';

import { encrypt } from '@/lib/encryption';
import { getIntegrationHandler } from '@comp/integrations';
import { db } from '@db';
import { Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { cookies, headers } from 'next/headers';
import { z } from 'zod';
import { authActionClient } from '../../../../../actions/safe-action';
import { runTests } from './run-tests';

const connectCloudSchema = z.object({
  cloudProvider: z.enum(['aws', 'gcp', 'azure']),
  credentials: z.record(z.string(), z.union([z.string(), z.array(z.string())])),
});

export const connectCloudAction = authActionClient
  .inputSchema(connectCloudSchema)
  .metadata({
    name: 'connect-cloud',
    track: {
      event: 'connect-cloud',
      channel: 'cloud-tests',
    },
  })
  .action(async ({ parsedInput: { cloudProvider, credentials }, ctx: { session } }) => {
    try {
      if (!session.activeOrganizationId) {
        return {
          success: false,
          error: 'No active organization found',
        };
      }

      // Validate credentials before storing
      try {
        const integrationHandler = getIntegrationHandler(cloudProvider);
        if (!integrationHandler) {
          return {
            success: false,
            error: 'Integration handler not found',
          };
        }

        // Process credentials to the format expected by the handler
        const typedCredentials = await integrationHandler.processCredentials(
          credentials,
          async () => '', // Pass through without encryption for validation
        );

        // Validate by attempting to fetch (this will throw if credentials are invalid)
        await integrationHandler.fetch(typedCredentials);
      } catch (error) {
        console.error('Credential validation failed:', error);
        return {
          success: false,
          error:
            error instanceof Error
              ? `Invalid credentials: ${error.message}`
              : 'Failed to validate credentials. Please check your credentials and try again.',
        };
      }

      // Encrypt all credential fields after validation
      const encryptedCredentials: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(credentials)) {
        if (typeof value === 'string') {
          if (value.trim()) {
            encryptedCredentials[key] = await encrypt(value);
          }
          continue;
        }

        if (Array.isArray(value)) {
          const encryptedItems = await Promise.all(
            value.filter(Boolean).map((item) => encrypt(item)),
          );
          encryptedCredentials[key] = encryptedItems;
        }
      }

      const accountId =
        typeof credentials.accountId === 'string' ? credentials.accountId.trim() : undefined;
      const connectionName =
        typeof credentials.connectionName === 'string'
          ? credentials.connectionName.trim()
          : undefined;
      const regionValues = Array.isArray(credentials.regions)
        ? credentials.regions
        : typeof credentials.region === 'string'
          ? [credentials.region]
          : [];

      const settings =
        cloudProvider === 'aws'
          ? {
              accountId,
              connectionName,
              regions: regionValues,
            }
          : {};

      // Create new integration (allow multiple per provider)
      const newIntegration = await db.integration.create({
        data: {
          name: connectionName || cloudProvider.toUpperCase(),
          integrationId: cloudProvider,
          organizationId: session.activeOrganizationId,
          userSettings: encryptedCredentials as Prisma.JsonObject,
          settings: settings as Prisma.JsonObject,
        },
      });

      // Trigger immediate scan for only this new connection
      const runResult = await runTests(newIntegration.id);

      if (runResult.success && runResult.publicAccessToken) {
        (await cookies()).set('publicAccessToken', runResult.publicAccessToken);
      }

      // Revalidate the path
      const headersList = await headers();
      let path = headersList.get('x-pathname') || headersList.get('referer') || '';
      path = path.replace(/\/[a-z]{2}\//, '/');
      revalidatePath(path);

      return {
        success: true,
        trigger: runResult.success
          ? {
              taskId: runResult.taskId ?? undefined,
              publicAccessToken: runResult.publicAccessToken ?? undefined,
            }
          : undefined,
        runErrors: runResult.success ? undefined : (runResult.errors ?? undefined),
      };
    } catch (error) {
      console.error('Failed to connect cloud provider:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to connect cloud provider',
      };
    }
  });
