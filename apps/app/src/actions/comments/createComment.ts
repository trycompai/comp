'use server';

import { BUCKET_NAME, s3Client } from '@/app/s3';
import { auth } from '@/utils/auth';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { AttachmentEntityType, CommentEntityType, db } from '@db';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { z } from 'zod';

// Helper to map fileType to AttachmentType
function mapFileTypeToAttachmentType(fileType: string) {
  const type = fileType.split('/')[0];
  switch (type) {
    case 'image':
      return 'image' as const;
    case 'video':
      return 'video' as const;
    case 'audio':
      return 'audio' as const;
    case 'application':
      if (fileType === 'application/pdf') return 'document' as const;
      return 'document' as const;
    default:
      return 'other' as const;
  }
}

// Define schema for attachment data
const attachmentSchema = z.object({
  id: z.string(), // temporary ID from frontend
  name: z.string(),
  fileType: z.string(),
  fileData: z.string(), // base64 encoded
});

// Define the input schema
const createCommentSchema = z
  .object({
    content: z.string(),
    entityId: z.string(),
    entityType: z.nativeEnum(CommentEntityType),
    attachments: z.array(attachmentSchema).optional(),
    pathToRevalidate: z.string().optional(),
  })
  .refine(
    (data) =>
      // Check if content is non-empty after trimming OR if attachments exist
      (data.content && data.content.trim().length > 0) ||
      (data.attachments && data.attachments.length > 0),
    {
      message: 'Comment cannot be empty unless attachments are provided.',
      path: ['content'],
    },
  );

export const createComment = async (input: z.infer<typeof createCommentSchema>) => {
  // Parse and validate the input
  const parseResult = createCommentSchema.safeParse(input);
  if (!parseResult.success) {
    return {
      success: false,
      error: parseResult.error.errors[0]?.message || 'Invalid input',
      data: null,
    };
  }

  const { content, entityId, entityType, attachments, pathToRevalidate } = parseResult.data;
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

      // 2. Upload and create attachments if provided
      if (attachments && attachments.length > 0) {
        console.log('Uploading and creating attachments for comment:', comment.id);

        for (const attachment of attachments) {
          // Convert base64 to buffer
          const fileBuffer = Buffer.from(attachment.fileData, 'base64');

          // Create S3 key
          const timestamp = Date.now();
          const sanitizedFileName = attachment.name.replace(/[^a-zA-Z0-9.-]/g, '_');
          const key = `${orgId}/attachments/comment/${comment.id}/${timestamp}-${sanitizedFileName}`;

          // Upload to S3
          const putCommand = new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
            Body: fileBuffer,
            ContentType: attachment.fileType,
          });

          await s3Client.send(putCommand);

          // Create attachment record
          await tx.attachment.create({
            data: {
              name: attachment.name,
              url: key,
              type: mapFileTypeToAttachmentType(attachment.fileType),
              entityId: comment.id,
              entityType: AttachmentEntityType.comment,
              organizationId: orgId,
            },
          });
        }
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
