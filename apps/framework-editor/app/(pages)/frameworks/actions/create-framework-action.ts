'use server';

import { db } from '@comp/db';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { FrameworkBaseSchema } from '../schemas'; // Import the shared schema
// Assuming revalidatePath might be used later, uncomment if needed.
// import { revalidatePath } from 'next/cache'

const CreateFrameworkSchema = FrameworkBaseSchema; // Use the shared schema

export interface CreateFrameworkActionState {
  success: boolean;
  data?: {
    id: string;
    name: string;
    description: string;
    version: string;
    // createdAt: Date // Removed for now
    // updatedAt: Date // Removed for now
  };
  error?: string;
  issues?: z.ZodIssue[];
}

export async function createFrameworkAction(
  // First argument is the previous state, initially null or the initial state.
  // It's not directly used in this simple version but is part of the pattern for useFormState.
  prevState: CreateFrameworkActionState | null,
  formData: FormData,
): Promise<CreateFrameworkActionState> {
  const rawInput = {
    name: formData.get('name'),
    description: formData.get('description'),
    version: formData.get('version') || '1.0.0',
  };

  const validationResult = CreateFrameworkSchema.safeParse(rawInput);

  if (!validationResult.success) {
    return {
      success: false,
      error: 'Invalid input.',
      issues: validationResult.error.issues,
    };
  }

  const { name, description, version } = validationResult.data;

  try {
    const newFramework = await db.frameworkEditorFramework.create({
      data: {
        name,
        description,
        version,
      },
    });
    revalidatePath('/frameworks');
    return {
      success: true,
      data: {
        id: newFramework.id,
        name: newFramework.name,
        description: newFramework.description,
        version: newFramework.version,
        // createdAt: newFramework.createdAt, // Removed for now
        // updatedAt: newFramework.updatedAt  // Removed for now
      },
    };
  } catch (error) {
    console.error('Failed to create framework:', error);
    // In a real app, you might want to log this error more formally
    // and provide a more user-friendly error message.
    return {
      success: false,
      error: 'Failed to create framework in the database. Please try again.',
    };
  }
}
