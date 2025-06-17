'use server';

import { db } from '@comp/db';
import type { JSONContent } from '@tiptap/react'; // Or from 'novel' if it exports it
import { revalidatePath } from 'next/cache';

interface UpdatePolicyContentArgs {
  policyId: string;
  content: JSONContent | JSONContent[]; // Expecting the full Tiptap object now
}

export async function updatePolicyContent({
  policyId,
  content,
}: UpdatePolicyContentArgs): Promise<{ success: boolean; message?: string }> {
  if (!policyId) {
    return { success: false, message: 'Policy ID is required.' };
  }

  // Ensure we received the full Tiptap document object and extract the content array
  let contentToSave: JSONContent[];
  if (
    typeof content === 'object' &&
    content !== null &&
    !Array.isArray(content) && // Ensure it's not already just an array
    content.type === 'doc' &&
    Array.isArray(content.content)
  ) {
    contentToSave = content.content;
  } else {
    // Handle cases where content is not the expected format
    console.error('Invalid content format received by updatePolicyContent:', content);
    return { success: false, message: 'Invalid content format received.' };
  }

  try {
    await db.frameworkEditorPolicyTemplate.update({
      where: { id: policyId },
      data: {
        content: contentToSave, // Save only the extracted array
      },
    });

    revalidatePath(`/policies/${policyId}`); // Revalidate the detail page
    return { success: true };
  } catch (error) {
    console.error('Error updating policy content:', error);
    return { success: false, message: 'Failed to update policy content.' };
  }
}
