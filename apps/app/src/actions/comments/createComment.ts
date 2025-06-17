'use server';

import { auth } from '@/utils/auth';
import { db } from '@comp/db';
import { AttachmentEntityType, CommentEntityType } from '@comp/db/types'; // Import AttachmentEntityType
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { z } from 'zod';

// Define the input schema
const createCommentSchema = z
  .object({
    content: z.string(),
    entityId: z.string(),
    entityType: z.nativeEnum(CommentEntityType),
    attachmentIds: z.array(z.string()).optional(),
    pathToRevalidate: z.string().optional(),
  })
  .refine(
    (data) =>
      // Check if content is non-empty after trimming OR if attachments exist
      (data.content && data.content.trim().length > 0) ||
      (data.attachmentIds && data.attachmentIds.length > 0),
    {
      message: 'Comment cannot be empty unless attachments are provided.',
      path: ['content'],
    },
  );

export const createComment = async (input: z.infer<typeof createCommentSchema>) => {
  const { content, entityId, entityType, attachmentIds, pathToRevalidate } = input;
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const orgId = session?.session?.activeOrganizationId;

  if (!orgId) {
    return {
      success: false,
      error: 'Not authorized - no active organization found.',
      data: null,
    };
  }

  if (!entityId) {
    console.error('Entity ID missing after validation in createComment');
    return {
      success: false,
      error: 'Internal error: Entity ID missing.',
      data: null,
    };
  }

  try {
    // Find the Member ID associated with the user and organization
    const member = await db.member.findFirst({
      where: {
        userId: session?.user?.id,
        organizationId: orgId,
      },
      select: { id: true },
    });

    if (!member) {
      return {
        success: false,
        error: 'Not authorized - member not found in organization.',
        data: null,
      };
    }

    // Wrap create and update in a transaction
    const result = await db.$transaction(async (tx) => {
      // 1. Create the comment within the transaction
      console.log('Creating comment:', {
        content,
        entityId,
        entityType,
        memberId: member.id,
        organizationId: orgId,
      });
      const comment = await tx.comment.create({
        data: {
          content: content ?? '',
          entityId,
          entityType,
          authorId: member.id,
          organizationId: orgId,
        },
      });

      // 2. Link attachments if provided (using updateMany)
      if (attachmentIds && attachmentIds.length > 0) {
        console.log('Linking attachments to comment:', attachmentIds);
        await tx.attachment.updateMany({
          where: {
            id: { in: attachmentIds },
            organizationId: orgId,
            entityId,
            entityType: entityType as AttachmentEntityType,
          },
          data: {
            entityId: comment.id,
            entityType: AttachmentEntityType.comment,
          },
        });
      }

      return comment;
    });

    const headersList = await headers();
    let path = headersList.get('x-pathname') || headersList.get('referer') || '';
    path = path.replace(/\/[a-z]{2}\//, '/');

    revalidatePath(path);

    return {
      success: true,
      data: result,
      error: null,
    };
  } catch (error) {
    console.error('Failed to create comment with attachments transaction:', error);
    return {
      success: false,
      error: 'Failed to save comment and link attachments.', // More specific error
      data: null,
    };
  }
};
