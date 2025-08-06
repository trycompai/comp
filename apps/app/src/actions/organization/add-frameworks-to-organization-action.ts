'use server';

import { getAddFrameworksSchema } from '@/actions/schema';
import { db, Prisma } from '@db';
import { getGT } from 'gt-next/server';
import { authWithOrgAccessClient } from '../safe-action';
import { _upsertOrgFrameworkStructureCore } from './lib/initialize-organization';

/**
 * Adds specified frameworks and their related entities (controls, policies, tasks)
 * to an existing organization. It ensures that entities are not duplicated if they
 * already exist (e.g., from a shared template or a previous addition).
 */
export const addFrameworksToOrganizationAction = authWithOrgAccessClient
  .inputSchema(async () => {
    const t = await getGT();
    return getAddFrameworksSchema(t);
  })
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
    const t = await getGT();

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
        throw new Error(t('No valid or visible frameworks found for the provided IDs.'));
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
