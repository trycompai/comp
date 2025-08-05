'use server';

import { authActionClient } from '@/actions/safe-action';
import { updateCommentSchema } from '@/actions/schema';
import { env } from '@/env.mjs';

const API_BASE_URL = env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';

export const updateComment = authActionClient
  .inputSchema(updateCommentSchema)
  .metadata({
    name: 'update-comment',
    track: {
      event: 'update-comment',
      channel: 'server',
      description: 'User updated a comment',
    },
  })
  .action(async ({ parsedInput, ctx }) => {
    const { commentId, content } = parsedInput;
    const { session } = ctx;

    if (!session.activeOrganizationId) {
      throw new Error('No active organization');
    }

    try {
      // Call the new generic comments API
      const response = await fetch(`${API_BASE_URL}/v1/comments/${commentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Organization-Id': session.activeOrganizationId,
          Cookie: `better-auth.session_token=${session.token}`,
        },
        body: JSON.stringify({ content }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to update comment: ${error}`);
      }

      const updatedComment = await response.json();

      return {
        success: true,
        data: updatedComment,
      };
    } catch (error) {
      console.error('Failed to update comment:', error);
      throw error;
    }
  });
