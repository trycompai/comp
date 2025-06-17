'use server';

import { db } from '@comp/db';
import { Prisma } from '@prisma/client'; // Import Prisma for error types
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const DeleteRequirementSchema = z.object({
  requirementId: z.string().min(1, { message: 'Requirement ID is required' }),
  frameworkId: z.string().min(1, { message: 'Framework ID is required for revalidation' }),
});

export interface DeleteRequirementActionState {
  success: boolean;
  error?: string;
  issues?: z.ZodIssue[];
}

export async function deleteRequirementAction(
  prevState: DeleteRequirementActionState | null,
  formData: FormData,
): Promise<DeleteRequirementActionState> {
  const rawInput = {
    requirementId: formData.get('requirementId'),
    frameworkId: formData.get('frameworkId'),
  };

  const validationResult = DeleteRequirementSchema.safeParse(rawInput);

  if (!validationResult.success) {
    return {
      success: false,
      error: 'Invalid input for deleting requirement.',
      issues: validationResult.error.issues,
    };
  }

  const { requirementId, frameworkId } = validationResult.data;

  try {
    // Before deleting a requirement, ensure any dependent entities are handled
    // e.g., if controls are linked to requirements and there's a relation that needs cleanup.
    // For a simple delete where Prisma handles cascades or there are no strict FK constraints preventing delete:
    await db.frameworkEditorRequirement.delete({
      where: { id: requirementId },
    });

    revalidatePath(`/frameworks/${frameworkId}`);

    return {
      success: true,
    };
  } catch (error) {
    console.error('Failed to delete requirement:', error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // Specific Prisma errors
      if (error.code === 'P2025') {
        return {
          success: false,
          error: 'Requirement not found or already deleted.',
        };
      }
      // Add other Prisma error codes to handle if needed, e.g., P2003 for foreign key constraints
      // if (error.code === 'P2003') {
      //   return { success: false, error: 'Cannot delete requirement due to existing relations (e.g., linked controls).' };
      // }
    }
    // General error message
    const errorMessage =
      error instanceof Error ? error.message : 'An unexpected database error occurred.';
    return {
      success: false,
      error: `Database error: ${errorMessage}`,
    };
  }
}
