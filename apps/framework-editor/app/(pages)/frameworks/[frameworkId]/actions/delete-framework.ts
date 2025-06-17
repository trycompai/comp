'use server';

import { db } from '@comp/db'; // Uncommented and assuming this is the correct path to your Prisma client instance
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

// Schema for input validation
const DeleteFrameworkSchema = z.object({
  frameworkId: z.string().min(1, { message: 'Framework ID is required' }),
});

export interface DeleteFrameworkActionState {
  success: boolean;
  error?: string;
  message?: string; // Optional: for success messages before redirect or more detailed errors
  issues?: z.ZodIssue[];
}

export async function deleteFrameworkAction(
  // prevState is not strictly used here as redirect happens on success, but kept for pattern consistency
  prevState: DeleteFrameworkActionState | null,
  formData: FormData,
): Promise<DeleteFrameworkActionState> {
  const rawInput = {
    frameworkId: formData.get('frameworkId'),
  };

  const validationResult = DeleteFrameworkSchema.safeParse(rawInput);

  if (!validationResult.success) {
    return {
      success: false,
      error: 'Invalid input: Framework ID is missing or invalid.',
      issues: validationResult.error.issues,
    };
  }

  const { frameworkId } = validationResult.data;

  try {
    // Step 1: Delete all related FrameworkEditorRequirement records
    // This is important if cascading deletes are not configured or if you want explicit control.
    console.log(`Attempting to delete requirements for frameworkId: ${frameworkId}`);
    await db.frameworkEditorRequirement.deleteMany({
      where: { frameworkId: frameworkId },
    });
    console.log(`Successfully deleted requirements for frameworkId: ${frameworkId}`);

    // Step 2: Delete the FrameworkEditorFramework itself
    console.log(`Attempting to delete framework with id: ${frameworkId}`);
    await db.frameworkEditorFramework.delete({
      where: { id: frameworkId },
    });
    console.log(`Successfully deleted framework with id: ${frameworkId}`);

    revalidatePath('/frameworks');
    revalidatePath(`/frameworks/${frameworkId}`); // Revalidate the specific framework page
  } catch (error) {
    console.error('Failed to delete framework and/or its requirements:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'An unexpected server error occurred.';
    return {
      success: false,
      error: `Database operation failed: ${errorMessage}`,
    };
  }

  // If deletion logic is successful, redirect to the frameworks list page.
  // redirect() will throw a NEXT_REDIRECT error, and Next.js will handle the client-side redirection.
  redirect('/frameworks');

  // This part is effectively unreachable due to redirect(), but can be here for type consistency or if redirect was conditional.
  // return { success: true, message: "Framework deleted successfully. Redirecting..." };
}
