'use server';

import { AppError, appErrors } from '@/lib/errors';
import { CommentEntityType, db } from '@db';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { z } from 'zod';
import { authActionClient } from './safe-action';

export const addCommentAction = authActionClient
  .inputSchema(
    z.object({
      content: z.string(),
      entityId: z.string(),
      entityType: z.nativeEnum(CommentEntityType),
    }),
  )
  .metadata({
    name: 'add-comment',
    track: {
      event: 'add-comment',
      channel: 'server',
    },
  })
  .action(async ({ parsedInput, ctx }) => {
    const { content, entityId, entityType } = parsedInput;
    const { user, session } = ctx;

    if (!session || !session.activeOrganizationId) {
      return {
        success: false,
        error: appErrors.UNAUTHORIZED,
      };
    }

    try {
      const member = await db.member.findFirst({
        where: {
          userId: session.userId,
          organizationId: session.activeOrganizationId,
          deactivated: false,
        },
      });

      if (!member) {
        return {
          success: false,
          error: appErrors.UNAUTHORIZED,
        };
      }

      const comment = await db.comment.create({
        data: {
          content,
          entityId,
          entityType,
          organizationId: session.activeOrganizationId,
          authorId: member.id,
        },
      });

      const headersList = await headers();
      let path = headersList.get('x-pathname') || headersList.get('referer') || '';
      path = path.replace(/\/[a-z]{2}\//, '/');

      revalidatePath(path);

      return { success: true, data: comment };
    } catch (error) {
      return {
        success: false,
        error: error instanceof AppError ? error : appErrors.UNEXPECTED_ERROR,
      };
    }
  });
