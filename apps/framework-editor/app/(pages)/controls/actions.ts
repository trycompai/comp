'use server';

import { db } from '@comp/db';
import { revalidatePath } from 'next/cache';
import type { SearchableItemForLinking } from '@/app/components/SearchAndLinkList'; // Assuming this path is correct
import { z } from 'zod';
import { createControlTemplateSchema } from './schemas';
import type { FrameworkEditorControlTemplate } from '@prisma/client';

/**
 * Fetches all requirements, including their framework name and identifier.
 */
export async function getAllRequirements(): Promise<SearchableItemForLinking[]> {
  try {
    const requirements = await db.frameworkEditorRequirement.findMany({
      select: {
        id: true,
        identifier: true,
        name: true, // Descriptive name
        framework: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        // Consider if ordering by identifier or name is preferred. Currently descriptive name.
        name: 'asc',
      },
    });
    return requirements.map((r) => {
      let primaryDisplayLabel = r.identifier; // Start with identifier
      if (r.identifier && r.name) {
        // If both identifier and descriptive name exist
        primaryDisplayLabel = `${r.identifier} - ${r.name}`;
      } else if (r.name) {
        // Else if only descriptive name exists
        primaryDisplayLabel = r.name;
      }
      // If only identifier exists, it's already set. If neither, fallback.
      primaryDisplayLabel = primaryDisplayLabel || 'Unnamed Requirement';

      return {
        id: r.id,
        name: primaryDisplayLabel,
        sublabel: r.framework?.name ? r.framework.name : undefined,
      };
    });
  } catch (error) {
    console.error('Error fetching all requirements:', error);
    throw new Error('Failed to fetch all requirements.');
  }
}

/**
 * Links a requirement to a control template.
 */
export async function linkRequirementToControl(
  controlId: string,
  requirementId: string,
): Promise<void> {
  if (!controlId || !requirementId) {
    throw new Error('Control ID and Requirement ID must be provided.');
  }
  try {
    await db.frameworkEditorControlTemplate.update({
      where: { id: controlId },
      data: {
        requirements: {
          connect: { id: requirementId },
        },
      },
    });
    revalidatePath(`/controls/${controlId}`);
    revalidatePath('/controls'); // Also revalidate the list page if counts are shown there
  } catch (error) {
    console.error('Error linking requirement to control:', error);
    throw new Error('Failed to link requirement.');
  }
}

/**
 * Unlinks a requirement from a control template.
 */
export async function unlinkRequirementFromControl(
  controlId: string,
  requirementId: string,
): Promise<void> {
  if (!controlId || !requirementId) {
    throw new Error('Control ID and Requirement ID must be provided.');
  }
  try {
    await db.frameworkEditorControlTemplate.update({
      where: { id: controlId },
      data: {
        requirements: {
          disconnect: { id: requirementId },
        },
      },
    });
    revalidatePath(`/controls/${controlId}`);
    revalidatePath('/controls');
  } catch (error) {
    console.error('Error unlinking requirement from control:', error);
    throw new Error('Failed to unlink requirement.');
  }
}

// --- Policy Template Actions ---

/**
 * Fetches all policy templates.
 */
export async function getAllPolicyTemplates(): Promise<SearchableItemForLinking[]> {
  try {
    const policyTemplates = await db.frameworkEditorPolicyTemplate.findMany({
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
    // Policy templates only have a name, sublabel will be undefined
    return policyTemplates.map((pt: { id: string; name: string }) => ({
      id: pt.id,
      name: pt.name,
      // sublabel will be implicitly undefined
    }));
  } catch (error) {
    console.error('Error fetching all policy templates:', error);
    throw new Error('Failed to fetch all policy templates.');
  }
}

/**
 * Links a policy template to a control template.
 */
export async function linkPolicyTemplateToControl(
  controlId: string,
  policyTemplateId: string,
): Promise<void> {
  if (!controlId || !policyTemplateId) {
    throw new Error('Control ID and Policy Template ID must be provided.');
  }
  try {
    await db.frameworkEditorControlTemplate.update({
      where: { id: controlId },
      data: {
        policyTemplates: {
          // Assuming a 'policyTemplates' relation exists on the control model
          connect: { id: policyTemplateId },
        },
      },
    });
    revalidatePath(`/controls/${controlId}`);
    revalidatePath('/controls');
  } catch (error) {
    console.error('Error linking policy template to control:', error);
    throw new Error('Failed to link policy template.');
  }
}

/**
 * Unlinks a policy template from a control template.
 */
export async function unlinkPolicyTemplateFromControl(
  controlId: string,
  policyTemplateId: string,
): Promise<void> {
  if (!controlId || !policyTemplateId) {
    throw new Error('Control ID and Policy Template ID must be provided.');
  }
  try {
    await db.frameworkEditorControlTemplate.update({
      where: { id: controlId },
      data: {
        policyTemplates: {
          disconnect: { id: policyTemplateId },
        },
      },
    });
    revalidatePath(`/controls/${controlId}`);
    revalidatePath('/controls');
  } catch (error) {
    console.error('Error unlinking policy template from control:', error);
    throw new Error('Failed to unlink policy template.');
  }
}

// --- Task Template Actions ---

/**
 * Fetches all task templates.
 */
export async function getAllTaskTemplates(): Promise<SearchableItemForLinking[]> {
  try {
    const taskTemplates = await db.frameworkEditorTaskTemplate.findMany({
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
    // Task templates only have a name, sublabel will be undefined
    return taskTemplates.map((tt: { id: string; name: string }) => ({
      id: tt.id,
      name: tt.name,
      // sublabel will be implicitly undefined
    }));
  } catch (error) {
    console.error('Error fetching all task templates:', error);
    throw new Error('Failed to fetch all task templates.');
  }
}

/**
 * Links a task template to a control template.
 */
export async function linkTaskTemplateToControl(
  controlId: string,
  taskTemplateId: string,
): Promise<void> {
  if (!controlId || !taskTemplateId) {
    throw new Error('Control ID and Task Template ID must be provided.');
  }
  try {
    await db.frameworkEditorControlTemplate.update({
      where: { id: controlId },
      data: {
        taskTemplates: {
          // Assuming a 'taskTemplates' relation exists on the control model
          connect: { id: taskTemplateId },
        },
      },
    });
    revalidatePath(`/controls/${controlId}`);
    revalidatePath('/controls');
  } catch (error) {
    console.error('Error linking task template to control:', error);
    throw new Error('Failed to link task template.');
  }
}

/**
 * Unlinks a task template from a control template.
 */
export async function unlinkTaskTemplateFromControl(
  controlId: string,
  taskTemplateId: string,
): Promise<void> {
  if (!controlId || !taskTemplateId) {
    throw new Error('Control ID and Task Template ID must be provided.');
  }
  try {
    await db.frameworkEditorControlTemplate.update({
      where: { id: controlId },
      data: {
        taskTemplates: {
          disconnect: { id: taskTemplateId },
        },
      },
    });
    revalidatePath(`/controls/${controlId}`);
    revalidatePath('/controls');
  } catch (error) {
    console.error('Error unlinking task template from control:', error);
    throw new Error('Failed to unlink task template.');
  }
}

// --- Control Actions ---

interface UpdateControlPayload {
  name: string;
  description: string;
}

/**
 * Updates the details of a control template.
 */
export async function updateControlDetails(
  controlId: string,
  data: UpdateControlPayload,
): Promise<void> {
  if (!controlId) {
    throw new Error('Control ID must be provided.');
  }
  if (!data.name || data.name.trim() === '') {
    throw new Error('Control name must be provided.');
  }

  try {
    await db.frameworkEditorControlTemplate.update({
      where: { id: controlId },
      data: {
        name: data.name,
        description: data.description,
      },
    });
    revalidatePath(`/controls/${controlId}`);
    revalidatePath('/controls');
  } catch (error) {
    console.error('Error updating control details:', error);
    throw new Error('Failed to update control details.');
  }
}

/**
 * Deletes a control template.
 */
export async function deleteControl(controlId: string): Promise<void> {
  if (!controlId) {
    throw new Error('Control ID must be provided.');
  }
  try {
    // Note: Depending on DB constraints, you might need to disconnect relations first
    // if there's no onDelete: Cascade or similar set up for related items.
    await db.frameworkEditorControlTemplate.delete({
      where: { id: controlId },
    });
    revalidatePath(`/controls/${controlId}`); // Or just /controls if navigating away
    revalidatePath('/controls');
  } catch (error) {
    console.error('Error deleting control:', error);
    // Consider more specific error handling, e.g., if control not found or if relations prevent deletion
    throw new Error('Failed to delete control.');
  }
}

/**
 * Creates a new control template.
 */
export async function createControl(rawData: {
  name: string | null;
  description?: string | null;
}): Promise<FrameworkEditorControlTemplate> {
  const validationResult = createControlTemplateSchema.safeParse(rawData);

  if (!validationResult.success) {
    const errorMessages = validationResult.error.issues
      .map((issue: z.ZodIssue) => `${issue.path.join('.')}: ${issue.message}`)
      .join(', ');
    throw new Error(`Invalid input for creating control: ${errorMessages}`);
  }

  const { name, description } = validationResult.data; // name is string, description is string | undefined

  try {
    const controlTemplate = await db.frameworkEditorControlTemplate.create({
      data: {
        name,
        description: description || '', // Ensure description is not undefined for Prisma
      },
    });

    revalidatePath('/controls');
    return controlTemplate;
  } catch (error) {
    console.error('Failed to create control template:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to create control template in the database.';
    throw new Error(`Database error: ${errorMessage}`);
  }
}
