'use server';

import { z } from 'zod';
import { db } from '@comp/db';
import { CreatePolicySchema } from './schemas';
import { revalidatePath } from 'next/cache';
import { FrameworkEditorPolicyTemplate, Frequency, Departments } from '@prisma/client'; // Import necessary types

export async function createPolicyAction(formData: z.infer<typeof CreatePolicySchema>) {
  const validatedFields = CreatePolicySchema.safeParse(formData);

  if (!validatedFields.success) {
    // Consider returning a more structured error for the form
    // For now, throwing an error or returning a simple error object
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Validation failed. Policy not created.',
    };
  }

  const { name, description, frequency, department } = validatedFields.data;

  try {
    const newPolicy = await db.frameworkEditorPolicyTemplate.create({
      data: {
        name,
        description,
        frequency,
        department,
        content: {}, // Defaulting content to an empty object as it's not in the form but required by schema
      },
    });

    revalidatePath('/policies');
    // Redirect will be handled on the client after a successful response
    // or we can redirect here and handle the response on the client to show a success message before redirect
    return { success: true, policyId: newPolicy.id };
  } catch (error) {
    console.error('Error creating policy:', error);
    return {
      errors: null,
      message: 'An error occurred while creating the policy.',
    };
  }
}

// --- Validation Schemas ---

const PolicyDetailsSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().nullish(), // Allow null or undefined, map to null for Prisma
  frequency: z.nativeEnum(Frequency), // Use the correct enum name
  department: z.nativeEnum(Departments), // Use the correct enum name
});

// Type for the update data based on the schema
type UpdatePolicyData = z.infer<typeof PolicyDetailsSchema>;

// --- Update Policy Template Details ---

export async function updatePolicyTemplateDetails(
  policyId: string,
  data: UpdatePolicyData,
): Promise<{
  success: boolean;
  message: string;
  policy?: FrameworkEditorPolicyTemplate;
}> {
  // Validate incoming data first
  const validationResult = PolicyDetailsSchema.safeParse(data);

  if (!validationResult.success) {
    console.error('Validation failed:', validationResult.error.flatten());
    const errorMessages = validationResult.error.flatten().fieldErrors;
    const formattedErrors = Object.entries(errorMessages)
      .map(([field, messages]) => `${field}: ${messages?.join(', ')}`)
      .join('; ');
    return {
      success: false,
      message: `Invalid data: ${formattedErrors || 'Please check your input.'}`,
      policy: undefined,
    };
  }

  // Prepare data for Prisma: map nullish description to undefined if necessary
  const prismaData = {
    ...validationResult.data,
    description: validationResult.data.description ?? undefined,
  };

  try {
    const updatedPolicy = await db.frameworkEditorPolicyTemplate.update({
      where: { id: policyId },
      data: prismaData, // Use the potentially modified data
    });
    revalidatePath('/policies');
    revalidatePath(`/policies/${policyId}`);
    return {
      success: true,
      message: 'Policy updated successfully.',
      policy: updatedPolicy,
    };
  } catch (error) {
    console.error('Failed to update policy:', error);
    return {
      success: false,
      message: 'Database error: Failed to update policy.',
      policy: undefined,
    };
  }
}

// --- Delete Policy Template ---

export async function deletePolicyTemplate(
  policyId: string,
): Promise<{ success: boolean; message: string }> {
  if (!policyId) {
    return { success: false, message: 'Policy ID is required.' };
  }

  try {
    await db.frameworkEditorPolicyTemplate.delete({
      where: { id: policyId },
    });
    revalidatePath('/policies');
    return { success: true, message: 'Policy deleted successfully.' };
  } catch (error) {
    console.error('Failed to delete policy:', error);
    return {
      success: false,
      message: 'Database error: Failed to delete policy.',
    };
  }
}
