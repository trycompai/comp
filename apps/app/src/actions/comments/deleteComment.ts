'use server';

import { authActionClient } from '@/actions/safe-action';
import { deleteCommentSchema } from '@/actions/schema';
import { env } from '@/env.mjs';

const API_BASE_URL = env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';

export const deleteComment = authActionClient
  .inputSchema(deleteCommentSchema)
  .metadata({
    name: 'delete-comment',
    track: {
      event: 'delete-comment',
      channel: 'server',
      description: 'User deleted a comment',
    },
  })
  .action(async ({ parsedInput, ctx }) => {
    const { commentId } = parsedInput;
    const { session } = ctx;

    if (!session.activeOrganizationId) {
      throw new Error('No active organization');
    }

    try {
      // Call the new generic comments API
      const response = await fetch(`${API_BASE_URL}/v1/comments/${commentId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-Organization-Id': session.activeOrganizationId,
          Cookie: `better-auth.session_token=${session.token}`,
        },
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to delete comment: ${error}`);
      }

      return {
        success: true,
        data: { deletedCommentId: commentId },
      };
    } catch (error) {
      console.error('Failed to delete comment:', error);
      throw error;
    }
  });
