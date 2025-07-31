'use server';

import { BUCKET_NAME, s3Client } from '@/app/s3';
import { logger } from '@/utils/logger';

// This log will run as soon as the module is loaded.
logger.info('[uploadFile] Module loaded.');

import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { AttachmentEntityType, AttachmentType, db } from '@db';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { authActionClient } from '../safe-action';

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

export const uploadFile = authActionClient
  .inputSchema(uploadAttachmentSchema)
  .metadata({
    name: 'uploadFile',
    track: {
      event: 'File Uploaded',
      channel: 'server',
    },
  })
  .action(async ({ parsedInput, ctx }) => {
    const { fileName, fileType, fileData, entityId, entityType, pathToRevalidate } = parsedInput;
    const { session } = ctx;
    const organizationId = session.activeOrganizationId;

    logger.info(`[uploadFile] Starting upload for ${fileName} in org ${organizationId}`);

    const fileBuffer = Buffer.from(fileData, 'base64');

    const MAX_FILE_SIZE_MB = 10;
    const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
    if (fileBuffer.length > MAX_FILE_SIZE_BYTES) {
      throw new Error(`File exceeds the ${MAX_FILE_SIZE_MB}MB limit.`);
    }

    const timestamp = Date.now();
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const key = `${organizationId}/attachments/${entityType}/${entityId}/${timestamp}-${sanitizedFileName}`;

    try {
      logger.info(`[uploadFile] Uploading to S3 with key: ${key}`);
      const putCommand = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: fileBuffer,
        ContentType: fileType,
      });
      await s3Client.send(putCommand);
      logger.info(`[uploadFile] S3 upload successful for key: ${key}`);

      logger.info(`[uploadFile] Creating attachment record in DB for key: ${key}`);
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
      logger.info(`[uploadFile] DB record created with id: ${attachment.id}`);

      logger.info(`[uploadFile] Generating signed URL for key: ${key}`);
      const getCommand = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
      });
      const signedUrl = await getSignedUrl(s3Client, getCommand, {
        expiresIn: 900,
      });
      logger.info(`[uploadFile] Signed URL generated for key: ${key}`);

      if (pathToRevalidate) {
        revalidatePath(pathToRevalidate);
      }

      return {
        ...attachment,
        signedUrl,
      };
    } catch (error) {
      logger.error(`[uploadFile] Error during upload process for key ${key}:`, error);
      // Re-throw the error to be handled by the safe action client
      throw error;
    }
  });
