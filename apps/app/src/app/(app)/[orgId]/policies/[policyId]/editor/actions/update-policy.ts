'use server';

import { authActionClient } from '@/actions/safe-action';
import type { ActionResponse } from '@/actions/types';
import { auth } from '@/utils/auth';
import { db } from '@db';
import { headers } from 'next/headers';
import { appErrors, updatePolicySchema } from '../types';

// Helper function to clean the content by removing function references
function cleanContent(content: any): any {
  if (!content) return content;

  if (Array.isArray(content)) {
    return content.map((item) => cleanContent(item));
  }

  if (typeof content === 'object') {
    const cleaned: any = {};
    for (const [key, value] of Object.entries(content)) {
      // Skip function properties
      if (typeof value === 'function') continue;
      cleaned[key] = cleanContent(value);
    }
    return cleaned;
  }

  return content;
}

export const updatePolicy = authActionClient
  .inputSchema(updatePolicySchema)
  .metadata({
    name: 'update-policy',
    track: {
      event: 'update-policy',
      channel: 'server',
    },
  })
  .action(async ({ parsedInput }): Promise<ActionResponse> => {
    const { policyId, content, status } = parsedInput;

    const session = await auth.api.getSession({
      headers: await headers(),
    });

    const organizationId = session?.session.activeOrganizationId;

    if (!organizationId) {
      return {
        success: false,
        error: appErrors.UNAUTHORIZED.message,
      };
    }

    try {
      const existingPolicy = await db.policy.findUnique({
        where: {
          id: policyId,
          organizationId,
        },
      });

      if (!existingPolicy) {
        return {
          success: false,
          error: appErrors.NOT_FOUND.message,
        };
      }

      const updateData: Record<string, any> = {};

      if (content !== undefined) {
        // Clean the content before processing
        const cleanedContent = cleanContent(content);

        if (typeof cleanedContent === 'object' && cleanedContent !== null) {
          if (
            'type' in cleanedContent &&
            cleanedContent.type === 'doc' &&
            'content' in cleanedContent &&
            Array.isArray(cleanedContent.content)
          ) {
            updateData.content = cleanedContent.content;
          } else if (Array.isArray(cleanedContent)) {
            updateData.content = cleanedContent;
          } else {
            updateData.content = cleanedContent;
          }
        } else {
          updateData.content = cleanedContent;
        }
      }

      if (status) {
        updateData.status = status;
      }

      if (Object.keys(updateData).length === 0) {
        return {
          success: true,
          data: { id: policyId, status: existingPolicy.status },
        };
      }

      const updatedPolicy = await db.policy.update({
        where: {
          id: policyId,
          organizationId,
        },
        data: {
          ...updateData,
          signedBy: [],
        },
        select: {
          id: true,
          status: true,
        },
      });

      return {
        success: true,
        data: updatedPolicy,
      };
    } catch (error) {
      console.error('Error updating policy:', error);
      return {
        success: false,
        error: appErrors.UNEXPECTED_ERROR.message,
      };
    }
  });
