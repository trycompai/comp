'use server';

import { db } from '@db';
import { logger } from '@trigger.dev/sdk';
import { revalidatePath, revalidateTag } from 'next/cache';
import { authActionClient } from '../safe-action';
import { updatePolicySchema } from '../schema';

interface ContentNode {
  type: string;
  content?: ContentNode[];
  text?: string;
  attrs?: Record<string, any>;
  marks?: Array<{ type: string; attrs?: Record<string, any> }>;
  [key: string]: any;
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

export const updatePolicyAction = authActionClient
  .inputSchema(updatePolicySchema)
  .metadata({
    name: 'update-policy',
    track: {
      event: 'update-policy',
      description: 'Update Policy',
      channel: 'server',
    },
  })
  .action(async ({ parsedInput, ctx }) => {
    const { id, content } = parsedInput;
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
        where: { id, organizationId: activeOrganizationId },
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
        where: { id },
        data: { content: processedContent.content },
      });

      revalidatePath(`/${activeOrganizationId}/policies/${id}`);
      revalidatePath(`/${activeOrganizationId}/policies`);
      revalidateTag(`user_${user.id}`, 'max');

      return {
        success: true,
      };
    } catch (error) {
      logger.error('Error updating policy:', {
        error,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorStack: error instanceof Error ? error.stack : undefined,
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update policy',
      };
    }
  });
