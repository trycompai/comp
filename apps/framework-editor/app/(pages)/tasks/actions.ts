'use server';

import { db } from '@comp/db';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { Frequency, Departments, type FrameworkEditorTaskTemplate } from '@prisma/client';
import type { ItemWithName } from '../../components/grid/RelationalCell'; // Updated import path

// Zod schema for validating new task template data
const createTaskTemplateSchema = z.object({
  name: z.string().min(1, { message: 'Task name cannot be empty.' }),
  description: z.string().nullable().optional(), // Description can be empty or null
  frequency: z.nativeEnum(Frequency).optional(),
  department: z.nativeEnum(Departments).optional(),
});

// Placeholder data type for creation
export interface CreateTaskData {
  name: string;
  description?: string | null; // Kept flexible for input, will be defaulted if null
  frequency?: Frequency | null; // Use imported Enum
  department?: Departments | null; // Use imported Enum
}

// Placeholder data type for update
export interface UpdateTaskData {
  name?: string;
  description?: string | null;
  frequency?: Frequency | null; // Use imported Enum
  department?: Departments | null; // Use imported Enum
}

export async function createTaskTemplate(
  data: CreateTaskData,
): Promise<FrameworkEditorTaskTemplate> {
  console.log('[Server Action] createTaskTemplate called with:', data);

  const validationResult = createTaskTemplateSchema.safeParse(data);
  if (!validationResult.success) {
    console.error(
      '[Server Action] Validation failed:',
      validationResult.error.flatten().fieldErrors,
    );
    throw new Error(
      `Validation failed: ${validationResult.error.flatten().fieldErrors.name?.[0] || 'Invalid input'}`,
    );
  }

  const { name, description, frequency, department } = validationResult.data;

  try {
    const newTask = await db.frameworkEditorTaskTemplate.create({
      data: {
        name: name,
        description: description ?? '', // Ensure description is a string, even if null initially
        frequency: frequency ?? Frequency.monthly, // Default if not provided
        department: department ?? Departments.none, // Default if not provided
      },
    });
    console.log('[Server Action] Task created:', newTask);
    revalidatePath('/tasks'); // Revalidate the tasks list page
    return newTask;
  } catch (error) {
    console.error('[Server Action] Error creating task:', error);
    throw new Error('Failed to create task template. Please try again.');
  }
}

export async function updateTaskTemplate(
  id: string,
  data: UpdateTaskData,
): Promise<FrameworkEditorTaskTemplate> {
  console.log('[Server Action] updateTaskTemplate called with id:', id, 'data:', data);
  if (!id) {
    throw new Error('Task ID must be provided for an update.');
  }

  // Prepare data for update, only including fields that are actually provided by the client
  const updatePayload: Partial<
    Omit<FrameworkEditorTaskTemplate, 'id' | 'createdAt' | 'updatedAt'> & {
      updatedAt?: Date;
    }
  > = {};

  if (data.name !== undefined && data.name !== null) updatePayload.name = data.name;
  if (data.description !== undefined) updatePayload.description = data.description ?? ''; // Handle null by setting to empty string
  if (data.frequency !== undefined && data.frequency !== null)
    updatePayload.frequency = data.frequency;
  if (data.department !== undefined && data.department !== null)
    updatePayload.department = data.department;

  if (Object.keys(updatePayload).length === 0) {
    // If no actual data fields to update, fetch and return the existing record without an update call
    // Or, if this scenario implies an error or no-op, handle accordingly.
    console.warn(
      `[Server Action] updateTaskTemplate called for id: ${id} with no changed fields to update.`,
    );
    const existingTask = await db.frameworkEditorTaskTemplate.findUnique({
      where: { id },
    });
    if (!existingTask) throw new Error(`Task template with id ${id} not found.`);
    return existingTask;
  }

  updatePayload.updatedAt = new Date(); // Explicitly set updatedAt for the update operation

  try {
    const updatedTask = await db.frameworkEditorTaskTemplate.update({
      where: { id },
      data: updatePayload,
    });
    console.log('[Server Action] Task updated:', updatedTask);
    revalidatePath('/tasks'); // Revalidate the tasks list page
    revalidatePath(`/tasks/${id}`); // Revalidate specific task page if it exists
    return updatedTask;
  } catch (error) {
    console.error(`[Server Action] Error updating task ${id}:`, error);
    throw new Error(`Failed to update task template with id ${id}. Please try again.`);
  }
}

export async function deleteTaskTemplate(id: string): Promise<void> {
  console.log('[Server Action] deleteTaskTemplate called with id:', id);
  if (!id) {
    throw new Error('Task ID must be provided for deletion.');
  }
  try {
    await db.frameworkEditorTaskTemplate.delete({
      where: { id },
    });
    console.log('[Server Action] Task deleted:', id);
    revalidatePath('/tasks'); // Revalidate the tasks list page
  } catch (error) {
    console.error(`[Server Action] Error deleting task ${id}:`, error);
    throw new Error(`Failed to delete task template with id ${id}. Please try again.`);
  }
}

// Example if needed for relational columns, similar to getAllPolicyTemplates in ControlsClientPage
// For now, tasks are simpler and might not need this directly in the main grid.
// export async function getAllTaskTemplatesForLinking(): Promise<{ id: string; name: string }[]> {
//    console.log('[Server Action] getAllTaskTemplatesForLinking called');
//    // Replace with actual database logic
//    return [];
// }

// --- Task <-> Control Linking Actions ---

/**
 * Fetches all control templates for linking to tasks.
 */
export async function getAllControlsForLinking(): Promise<ItemWithName[]> {
  try {
    const controls = await db.frameworkEditorControlTemplate.findMany({
      select: {
        id: true,
        name: true,
        // Add any other relevant fields, e.g., a sublabel if needed
        // For example, if controls have a 'domain' or 'family':
        // domain: { select: { name: true } }
      },
      orderBy: {
        name: 'asc',
      },
    });
    return controls.map((c) => ({
      id: c.id,
      name: c.name || 'Unnamed Control', // Ensure name exists
      // sublabel: c.domain?.name // Example if sublabel is needed
    }));
  } catch (error) {
    console.error('Error fetching all control templates for linking:', error);
    throw new Error('Failed to fetch control templates.');
  }
}

/**
 * Links a control template to a task template.
 */
export async function linkControlToTask(taskId: string, controlId: string): Promise<void> {
  if (!taskId || !controlId) {
    throw new Error('Task ID and Control ID must be provided.');
  }
  try {
    await db.frameworkEditorTaskTemplate.update({
      where: { id: taskId },
      data: {
        controlTemplates: {
          connect: { id: controlId },
        },
      },
    });
    revalidatePath('/tasks'); // Revalidate tasks list
    // Potentially revalidate a specific task page if one exists: revalidatePath(`/tasks/${taskId}`);
  } catch (error) {
    console.error('Error linking control to task:', error);
    throw new Error('Failed to link control to task.');
  }
}

/**
 * Unlinks a control template from a task template.
 */
export async function unlinkControlFromTask(taskId: string, controlId: string): Promise<void> {
  if (!taskId || !controlId) {
    throw new Error('Task ID and Control ID must be provided.');
  }
  try {
    await db.frameworkEditorTaskTemplate.update({
      where: { id: taskId },
      data: {
        controlTemplates: {
          disconnect: { id: controlId },
        },
      },
    });
    revalidatePath('/tasks');
    // Potentially revalidate a specific task page: revalidatePath(`/tasks/${taskId}`);
  } catch (error) {
    console.error('Error unlinking control from task:', error);
    throw new Error('Failed to unlink control from task.');
  }
}
