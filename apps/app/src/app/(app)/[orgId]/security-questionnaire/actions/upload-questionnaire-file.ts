'use server';

import { BUCKET_NAME, s3Client } from '@/app/s3';
import { authActionClient } from '@/actions/safe-action';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { db } from '@db';
import { AttachmentEntityType, AttachmentType } from '@db';
import { z } from 'zod';
import { randomBytes } from 'crypto';

const uploadSchema = z.object({
  fileName: z.string(),
  fileType: z.string(),
  fileData: z.string(), // base64 encoded
  organizationId: z.string(),
});

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

export const uploadQuestionnaireFile = authActionClient
  .inputSchema(uploadSchema)
  .metadata({
    name: 'upload-questionnaire-file',
    track: {
      event: 'upload-questionnaire-file',
      channel: 'server',
    },
  })
  .action(async ({ parsedInput, ctx }) => {
    const { fileName, fileType, fileData, organizationId } = parsedInput;
    const { session } = ctx;

    if (!session?.activeOrganizationId || session.activeOrganizationId !== organizationId) {
      throw new Error('Unauthorized');
    }

    if (!s3Client || !BUCKET_NAME) {
      throw new Error('S3 client not configured');
    }

    try {
      // Convert base64 to buffer
      const fileBuffer = Buffer.from(fileData, 'base64');

      // Validate file size (10MB limit)
      const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
      if (fileBuffer.length > MAX_FILE_SIZE_BYTES) {
        throw new Error(`File exceeds the ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB limit`);
      }

      // Generate unique file key
      const fileId = randomBytes(16).toString('hex');
      const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
      const timestamp = Date.now();
      const s3Key = `${organizationId}/questionnaire-uploads/${timestamp}-${fileId}-${sanitizedFileName}`;

      // Upload to S3
      const putCommand = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: s3Key,
        Body: fileBuffer,
        ContentType: fileType,
        Metadata: {
          originalFileName: fileName,
          organizationId,
        },
      });

      await s3Client.send(putCommand);

      // Return S3 key directly instead of creating attachment record
      // Questionnaire files are temporary processing files, not permanent attachments
      return {
        success: true,
        data: {
          s3Key,
          fileName,
          fileType,
        },
      };
    } catch (error) {
      throw error instanceof Error
        ? error
        : new Error('Failed to upload questionnaire file');
    }
  });

