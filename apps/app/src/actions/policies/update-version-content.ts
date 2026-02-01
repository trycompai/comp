'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '@db';
import type { Prisma } from '@db';
import { authActionClient } from '../safe-action';

interface ContentNode {
  type: string;
  content?: ContentNode[];
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
  [key: string]: unknown;
}

// Process content to ensure it's a plain serializable object
function processContent(content: ContentNode | ContentNode[]): ContentNode | ContentNode[] {
  if (!content) return content;

  if (Array.isArray(content)) {
    return content.map((node) => processContent(node) as ContentNode);
  }

  const processed: ContentNode = { type: content.type };

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

const updateVersionContentSchema = z.object({
  policyId: z.string().min(1, 'Policy ID is required'),
  versionId: z.string().min(1, 'Version ID is required'),
  content: z.any(), // TipTap content can be complex
  entityId: z.string(), // Required for audit tracking
});

export const updateVersionContentAction = authActionClient
  .inputSchema(updateVersionContentSchema)
  .metadata({
    name: 'update-version-content',
    track: {
      event: 'update-version-content',
      description: 'Update policy version content',
      channel: 'server',
    },
  })
  .action(async ({ parsedInput, ctx }) => {
    const { policyId, versionId, content } = parsedInput;
    const { activeOrganizationId } = ctx.session;

    if (!activeOrganizationId) {
      return { success: false, error: 'Not authorized' };
    }

    // Verify version exists and belongs to organization
    const version = await db.policyVersion.findUnique({
      where: { id: versionId },
      include: {
        policy: {
          select: {
            id: true,
            organizationId: true,
            currentVersionId: true,
            pendingVersionId: true,
          },
        },
      },
    });

    if (!version || version.policy.organizationId !== activeOrganizationId) {
      return { success: false, error: 'Version not found' };
    }

    if (version.policy.id !== policyId) {
      return { success: false, error: 'Version does not belong to this policy' };
    }

    // Cannot edit published version
    if (version.id === version.policy.currentVersionId) {
      return {
        success: false,
        error: 'Cannot edit the published version. Create a new version to make changes.',
      };
    }

    // Cannot edit pending version
    if (version.id === version.policy.pendingVersionId) {
      return {
        success: false,
        error: 'Cannot edit a version that is pending approval.',
      };
    }

    const processedContent = JSON.parse(
      JSON.stringify(processContent(content as ContentNode[])),
    ) as Prisma.InputJsonValue[];

    await db.policyVersion.update({
      where: { id: versionId },
      data: { content: processedContent },
    });

    revalidatePath(`/${activeOrganizationId}/policies/${policyId}`);

    return {
      success: true,
      data: { versionId },
    };
  });
