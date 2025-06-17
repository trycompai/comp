'use server';

import { addFrameworksSchema } from '@/actions/schema';
import { db } from '@comp/db';
import { Prisma } from '@comp/db/types';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { _upsertOrgFrameworkStructureCore } from './lib/initialize-organization';

// Duplicating the InitializeOrganizationInput type for clarity, can be shared if preferred
export type AddFrameworksInput = z.infer<typeof addFrameworksSchema>;

/**
 * Adds specified frameworks and their related entities (controls, policies, tasks)
 * to an existing organization. It ensures that entities are not duplicated if they
 * already exist (e.g., from a shared template or a previous addition).
 */
export const addFrameworksToOrganizationAction = async (
  input: AddFrameworksInput,
): Promise<{ success: boolean; error?: string }> => {
  try {
    const validatedInput = addFrameworksSchema.parse(input);
    const { frameworkIds, organizationId } = validatedInput;

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
        tx: tx as unknown as Prisma.TransactionClient, // Use the transaction client from this action
      });

      // The rest of the logic (creating instances, relations) is now inside _upsertOrgFrameworkStructureCore
    });

    revalidatePath('/'); // Revalidate all paths, or be more specific e.g. /${organizationId}/frameworks
    return { success: true };
  } catch (error) {
    console.error('Error in addFrameworksToOrganizationAction:', error);
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors.map((e) => e.message).join(', '),
      };
    } else if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'An unexpected error occurred.' };
  }
};
