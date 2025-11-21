'use server';

import { authActionClient } from '@/actions/safe-action';
import { APP_AWS_KNOWLEDGE_BASE_BUCKET, s3Client } from '@/app/s3';
import { db } from '@/lib/db';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { randomBytes } from 'crypto';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const uploadDocumentSchema = z.object({
  fileName: z.string(),
  fileType: z.string(),
  fileData: z.string(), // base64 encoded file
  description: z.string().optional(),
  organizationId: z.string(),
});

export const uploadKnowledgeBaseDocumentAction = authActionClient
  .inputSchema(uploadDocumentSchema)
  .metadata({
    name: 'upload-knowledge-base-document',
    track: {
      event: 'upload-knowledge-base-document',
      description: 'Upload Knowledge Base Document',
      channel: 'server',
    },
  })
  .action(async ({ parsedInput, ctx }) => {
    const { fileName, fileType, fileData, description, organizationId } = parsedInput;
    const { session } = ctx;

    if (!session?.activeOrganizationId || session.activeOrganizationId !== organizationId) {
      return {
        success: false,
        error: 'Not authorized',
      };
    }

    if (!s3Client) {
      return {
        success: false,
        error: 'S3 client not configured',
      };
    }

    if (!APP_AWS_KNOWLEDGE_BASE_BUCKET) {
      return {
        success: false,
        error:
          'Knowledge base bucket is not configured. Please set APP_AWS_KNOWLEDGE_BASE_BUCKET environment variable.',
      };
    }

    try {
      // Convert base64 to buffer
      const fileBuffer = Buffer.from(fileData, 'base64');

      // Validate file size (10MB limit)
      const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
      if (fileBuffer.length > MAX_FILE_SIZE_BYTES) {
        return {
          success: false,
          error: `File exceeds the ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB limit`,
        };
      }

      // Generate unique file key
      const fileId = randomBytes(16).toString('hex');
      const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
      const timestamp = Date.now();
      const s3Key = `${organizationId}/knowledge-base-documents/${timestamp}-${fileId}-${sanitizedFileName}`;

      // Sanitize filename for S3 metadata
      // S3 metadata values must be valid HTTP header values
      // To be absolutely safe, we'll encode the filename using a safe character set
      // Remove control characters and non-ASCII characters, keep only safe printable ASCII
      const sanitizedMetadataFileName = Buffer.from(fileName, 'utf8')
        .toString('ascii') // Convert to ASCII, replacing non-ASCII with '?'
        .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
        .replace(/\?/g, '_') // Replace '?' (from non-ASCII conversion) with '_'
        .trim()
        .substring(0, 1024); // S3 metadata values have a 2KB limit per value

      // Upload to S3
      const putCommand = new PutObjectCommand({
        Bucket: APP_AWS_KNOWLEDGE_BASE_BUCKET,
        Key: s3Key,
        Body: fileBuffer,
        ContentType: fileType,
        Metadata: {
          originalFileName: sanitizedMetadataFileName,
          organizationId,
        },
      });

      await s3Client.send(putCommand);

      // Create database record
      const document = await db.knowledgeBaseDocument.create({
        data: {
          name: fileName,
          description: description || null,
          s3Key,
          fileType,
          fileSize: fileBuffer.length,
          organizationId,
          processingStatus: 'pending',
        },
      });

      // Note: Processing is triggered by orchestrator in the component
      // when multiple files are uploaded, or individually for single files

      revalidatePath(`/${organizationId}/security-questionnaire/knowledge-base`);

      return {
        success: true,
        data: {
          id: document.id,
          name: document.name,
          s3Key: document.s3Key,
        },
      };
    } catch (error) {
      console.error('Error uploading knowledge base document:', error);
      return {
        success: false,
        error: 'Failed to upload document',
      };
    }
  });
