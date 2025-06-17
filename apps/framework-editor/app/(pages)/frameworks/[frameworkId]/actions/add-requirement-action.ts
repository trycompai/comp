'use server';

import { z } from 'zod';
import { db } from '@comp/db';
import { revalidatePath } from 'next/cache';
import type { FrameworkEditorRequirement } from '@prisma/client';

// Schema for validating requirement input
const AddRequirementSchema = z.object({
  name: z.string().min(3, { message: 'Requirement name must be at least 3 characters long' }),
  description: z.string().optional(), // Description can be optional
  identifier: z.string().optional(), // Identifier can be optional
  frameworkId: z.string().min(1, { message: 'Framework ID is required' }),
});

export interface AddRequirementActionState {
  success: boolean;
  data?: FrameworkEditorRequirement; // Return the created requirement on success
  error?: string;
  issues?: z.ZodIssue[];
  message?: string; // Added message property for success/general messages
}

export async function addRequirementAction(
  prevState: AddRequirementActionState | null,
  formData: FormData,
): Promise<AddRequirementActionState> {
  const rawInput = {
    name: formData.get('name'),
    description: formData.get('description'),
    identifier: formData.get('identifier'),
    frameworkId: formData.get('frameworkId'),
  };

  const validationResult = AddRequirementSchema.safeParse(rawInput);

  if (!validationResult.success) {
    return {
      success: false,
      error: 'Invalid input for requirement.',
      issues: validationResult.error.issues,
    };
  }

  const { name, description, identifier, frameworkId } = validationResult.data;

  try {
    const newRequirement = await db.frameworkEditorRequirement.create({
      data: {
        name,
        description: description || '', // Ensure description is at least an empty string if optional and not provided
        identifier: identifier || '', // Ensure identifier is at least an empty string if optional and not provided
        framework: {
          connect: { id: frameworkId },
        },
        // Assuming `order` might be a field you want to manage, e.g., for new requirements
        // If not, it can be omitted if it has a default or is nullable.
        // order: await getNextOrderForFramework(frameworkId) // Example: utility function to determine order
      },
    });

    // Revalidate the path to the framework's requirements page to show the new requirement
    revalidatePath(`/frameworks/${frameworkId}`);

    return {
      success: true,
      data: newRequirement,
      message: 'Requirement added successfully.',
    };
  } catch (error) {
    console.error('Failed to create requirement:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'An unexpected database error occurred.';
    return {
      success: false,
      error: `Database error: ${errorMessage}`,
    };
  }
}

// Example utility function (if needed for fields like 'order')
// async function getNextOrderForFramework(frameworkId: string): Promise<number> {
//   const lastRequirement = await db.frameworkEditorRequirement.findFirst({
//     where: { frameworkId },
//     orderBy: { order: 'desc' },
//   });
//   return (lastRequirement?.order ?? 0) + 1;
// }
