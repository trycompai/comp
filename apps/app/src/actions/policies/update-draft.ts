'use server';

import { db } from '@db';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { authActionClient } from '../safe-action';

interface ContentNode {
  type: string;
  content?: ContentNode[];
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
  [key: string]: unknown;
}

// Simplified content processor that creates a new plain object
function processContent(content: ContentNode | ContentNode[]): ContentNode | ContentNode[] {
  if (!content) return content;

  // Handle arrays
  if (Array.isArray(content)) {
    return content.map((node) => processContent(node) as ContentNode);
  }

  // Create a new plain object with only the necessary properties
  const processed: ContentNode = {
    type: content.type,
  };

  if (content.text !== undefined) {
    processed.text = content.text;
  }

  if (content.attrs) {
    processed.attrs = { ...content.attrs };
  }

  if (content.marks) {
    processed.marks = content.marks.map((mark) => ({
      type: mark.type,
      ...(mark.attrs && { attrs: { ...mark.attrs } }),
    }));
  }

  if (content.content) {
    processed.content = processContent(content.content) as ContentNode[];
  }

  return processed;
}

const updateDraftSchema = z.object({
  policyId: z.string().min(1, 'Policy ID is required'),
  content: z.any(),
  entityId: z.string(),
});

export const updateDraftAction = authActionClient
  .inputSchema(updateDraftSchema)
  .metadata({
    name: 'update-policy-draft',
    track: {
      event: 'update-policy-draft',
      description: 'Updated policy draft',
      channel: 'server',
    },
  })
  .action(async ({ parsedInput, ctx }) => {
    const { policyId, content } = parsedInput;
    const { activeOrganizationId } = ctx.session;
    const { user } = ctx;

    if (!activeOrganizationId) {
      return {
        success: false,
        error: 'Not authorized',
      };
    }

    if (!user) {
      return {
        success: false,
        error: 'Not authorized',
      };
    }

    try {
      const policy = await db.policy.findUnique({
        where: { id: policyId, organizationId: activeOrganizationId },
      });

      if (!policy) {
        return {
          success: false,
          error: 'Policy not found',
        };
      }

      // Create a new plain object from the content
      const processedContent = JSON.parse(JSON.stringify(processContent(content as ContentNode)));

      await db.policy.update({
        where: { id: policyId },
        data: {
          draftContent: processedContent.content,
          // Clear signedBy when draft is updated
          signedBy: [],
        },
      });

      revalidatePath(`/${activeOrganizationId}/policies/${policyId}`);

      return {
        success: true,
      };
    } catch (error) {
      console.error('Error updating policy draft:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update policy draft',
      };
    }
  });
