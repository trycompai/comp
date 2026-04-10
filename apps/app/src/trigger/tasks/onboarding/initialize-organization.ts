import { initializeOrganization } from '@/actions/organization/lib/initialize-organization';
import { resolveFrameworkIds } from '@/actions/organization/lib/resolve-framework-ids';
import { db } from '@db/server';
import { logger, queue, tags, task } from '@trigger.dev/sdk';

const initOrgQueue = queue({
  name: 'initialize-organization',
  concurrencyLimit: 10,
});

/**
 * Standalone Trigger.dev task for initializing an organization's framework
 * structure (framework instances, controls, policies, tasks, requirement maps).
 *
 * Use cases:
 * - Manual re-run from the Trigger.dev dashboard for orgs stuck in a partial state
 * - Automatic recovery when `completeOnboarding` detects missing framework instances
 *
 * Accepts optional `frameworkIds`. When omitted, resolves them by reverse-looking
 * framework names stored in the organization's onboarding context.
 */
export const initializeOrganizationTask = task({
  id: 'initialize-organization',
  queue: initOrgQueue,
  retry: {
    maxAttempts: 3,
  },
  run: async (payload: { organizationId: string; frameworkIds?: string[] }) => {
    const { organizationId } = payload;
    await tags.add([`org:${organizationId}`]);

    logger.info(`Initializing organization ${organizationId}`);

    // Check if already initialized
    const existingFrameworks = await db.frameworkInstance.findFirst({
      where: { organizationId },
    });

    if (existingFrameworks) {
      logger.info(
        `Organization ${organizationId} already has framework instances, skipping initialization`,
      );
      return { skipped: true, reason: 'already_initialized' };
    }

    // Resolve framework IDs
    const frameworkIds = payload.frameworkIds ?? (await resolveFrameworkIds(organizationId));

    if (frameworkIds.length === 0) {
      logger.error(`No framework IDs found for organization ${organizationId}`);
      throw new Error(
        `Cannot initialize organization ${organizationId}: no framework IDs found in context`,
      );
    }

    logger.info(
      `Initializing organization ${organizationId} with frameworks: ${frameworkIds.join(', ')}`,
    );

    await initializeOrganization({ frameworkIds, organizationId });

    logger.info(`Successfully initialized organization ${organizationId}`);
    return { skipped: false, frameworkIds };
  },
});

