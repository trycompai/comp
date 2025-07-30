'use server';

import { addFrameworksSchema } from '@/actions/schema';
import { db, Prisma } from '@db';
import { authWithOrgAccessClient } from '../safe-action';
import { _upsertOrgFrameworkStructureCore } from './lib/initialize-organization';

/**
 * Adds specified frameworks and their related entities (controls, policies, tasks)
 * to an existing organization. It ensures that entities are not duplicated if they
 * already exist (e.g., from a shared template or a previous addition).
 */
export const addFrameworksToOrganizationAction = authWithOrgAccessClient
  .inputSchema(addFrameworksSchema)
  .metadata({
    name: 'add-frameworks-to-organization',
    track: {
      event: 'add-frameworks',
      description: 'Add frameworks to organization',
      channel: 'server',
    },
  })
  .action(async ({ parsedInput, ctx }) => {
    const { user, member, organizationId } = ctx;
    const { frameworkIds } = parsedInput;

    await db.$transaction(async (tx) => {
      // 1. Fetch FrameworkEditorFrameworks and their requirements for the given frameworkIds, filtering by visible: true
      const frameworksAndRequirements = await tx.frameworkEditorFramework.findMany({
        where: {
          id: { in: frameworkIds },
          visible: true,
        },
        include: {
          requirements: true,
        },
      });

      if (frameworksAndRequirements.length === 0) {
        throw new Error('No valid or visible frameworks found for the provided IDs.');
      }

      const finalFrameworkEditorIds = frameworksAndRequirements.map((f) => f.id);

      // 2. Call the renamed core function
      await _upsertOrgFrameworkStructureCore({
        organizationId,
        targetFrameworkEditorIds: finalFrameworkEditorIds,
        frameworkEditorFrameworks: frameworksAndRequirements,
        tx: tx as unknown as Prisma.TransactionClient,
      });
    });

    // The safe action client will handle revalidation automatically
    return {
      success: true,
      frameworksAdded: frameworkIds.length,
    };
  });
