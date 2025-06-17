'use server';

import { BUCKET_NAME, s3Client } from '@/app/s3';
import { auth } from '@/utils/auth';
import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { db } from '@comp/db';
import { AttachmentEntityType, AttachmentType } from '@comp/db/types';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { z } from 'zod';

function mapFileTypeToAttachmentType(fileType: string): AttachmentType {
  const type = fileType.split('/')[0];
  switch (type) {
    case 'image':
      return AttachmentType.image;
    case 'video':
      return AttachmentType.video;
    case 'audio':
      return AttachmentType.audio;
    case 'application':
      return AttachmentType.document;
    default:
      return AttachmentType.other;
  }
}

const uploadAttachmentSchema = z.object({
  fileName: z.string(),
  fileType: z.string(),
  fileData: z.string(),
  entityId: z.string(),
  entityType: z.nativeEnum(AttachmentEntityType),
  pathToRevalidate: z.string().optional(),
});

export const uploadFile = async (input: z.infer<typeof uploadAttachmentSchema>) => {
  const { fileName, fileType, fileData, entityId, entityType, pathToRevalidate } = input;
  const session = await auth.api.getSession({ headers: await headers() });
  const organizationId = session?.session.activeOrganizationId;

  if (!organizationId) {
    return {
      success: false,
      error: 'Not authorized - no organization found',
      data: null,
    };
  }

  try {
    const fileBuffer = Buffer.from(fileData, 'base64');

    const MAX_FILE_SIZE_MB = 5;
    const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
    if (fileBuffer.length > MAX_FILE_SIZE_BYTES) {
      return {
        success: false,
        error: `File exceeds the ${MAX_FILE_SIZE_MB}MB limit.`,
        data: null,
      };
    }

    const timestamp = Date.now();
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const key = `${organizationId}/attachments/${entityType}/${entityId}/${timestamp}-${sanitizedFileName}`;

    const putCommand = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: fileBuffer,
      ContentType: fileType,
    });

    await s3Client.send(putCommand);

    console.log('Creating attachment...');
    console.log({
      name: fileName,
      url: key,
      type: mapFileTypeToAttachmentType(fileType),
      entityId: entityId,
      entityType: entityType,
      organizationId: organizationId,
    });

    const attachment = await db.attachment.create({
      data: {
        name: fileName,
        url: key,
        type: mapFileTypeToAttachmentType(fileType),
        entityId: entityId,
        entityType: entityType,
        organizationId: organizationId,
      },
    });

    const getCommand = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    const signedUrl = await getSignedUrl(s3Client, getCommand, {
      expiresIn: 900,
    });

    if (pathToRevalidate) {
      revalidatePath(pathToRevalidate);
    }

    return {
      success: true,
      data: {
        ...attachment,
        signedUrl,
      },
      error: null,
    } as const;
  } catch (error) {
    console.error('Upload file action error:', error);

    return {
      success: false,
      error: 'Failed to process file upload.',
      data: null,
    } as const;
  }
};
