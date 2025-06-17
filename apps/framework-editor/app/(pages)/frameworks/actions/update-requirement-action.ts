'use server';

import { z } from 'zod';
import { db } from '@comp/db';
import { revalidatePath } from 'next/cache';
import { RequirementBaseSchema } from '../schemas';
import type { FrameworkEditorRequirement } from '@prisma/client';

const UpdateRequirementSchema = RequirementBaseSchema.extend({
  id: z.string().min(1, { message: 'Requirement ID is required.' }),
  frameworkId: z.string().min(1, { message: 'Framework ID is required.' }), // To revalidate the correct path
});

export interface UpdateRequirementActionState {
  success: boolean;
  data?: Pick<FrameworkEditorRequirement, 'id' | 'name' | 'description' | 'identifier'>;
  error?: string;
  issues?: z.ZodIssue[];
}

export async function updateRequirementAction(
  prevState: UpdateRequirementActionState | null,
  formData: FormData,
): Promise<UpdateRequirementActionState> {
  const rawInput = {
    id: formData.get('id'),
    name: formData.get('name'),
    description: formData.get('description'),
    identifier: formData.get('identifier'),
    frameworkId: formData.get('frameworkId'),
  };

  const validationResult = UpdateRequirementSchema.safeParse(rawInput);

  if (!validationResult.success) {
    return {
      success: false,
      error: 'Invalid input.',
      issues: validationResult.error.issues,
    };
  }

  const { id, name, description, identifier, frameworkId } = validationResult.data;

  try {
    const existingRequirement = await db.frameworkEditorRequirement.findUnique({
      where: { id },
    });

    if (!existingRequirement) {
      return { success: false, error: 'Requirement not found.' };
    }

    const updatedRequirement = await db.frameworkEditorRequirement.update({
      where: { id },
      data: {
        name,
        description: description,
        identifier: identifier || '',
      },
      select: {
        id: true,
        name: true,
        description: true,
        identifier: true,
      },
    });

    revalidatePath(`/frameworks/${frameworkId}`);

    return { success: true, data: updatedRequirement };
  } catch (error) {
    console.error('Failed to update requirement:', error);
    return {
      success: false,
      error: 'Failed to update requirement in the database. Please try again.',
    };
  }
}
