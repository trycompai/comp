'use server';

import { authActionClient } from '@/actions/safe-action';
import { createCommentSchema } from '@/actions/schema';
import { env } from '@/env.mjs';

const API_BASE_URL = env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';

export const createComment = authActionClient
  .inputSchema(createCommentSchema)
  .metadata({
    name: 'create-comment',
    track: {
      event: 'create-comment',
      channel: 'server',
      description: 'User created a comment',
    },
  })
  .action(async ({ parsedInput, ctx }) => {
    const { content, entityId, entityType, attachments } = parsedInput;
    const { session } = ctx;

    if (!session.activeOrganizationId) {
      throw new Error('No active organization');
    }

    try {
      // Call the new generic comments API
      const response = await fetch(`${API_BASE_URL}/v1/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Organization-Id': session.activeOrganizationId,
          Cookie: `better-auth.session_token=${session.token}`,
        },
        body: JSON.stringify({
          content,
          entityId,
          entityType,
          attachments,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to create comment: ${error}`);
      }

      const newComment = await response.json();

      return {
        success: true,
        data: newComment,
      };
    } catch (error) {
      console.error('Failed to create comment:', error);
      throw error;
    }
  });
