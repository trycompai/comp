'use server';

import { authActionClient } from '@/actions/safe-action';
import { APP_AWS_KNOWLEDGE_BASE_BUCKET, s3Client } from '@/app/s3';
import { db } from '@/lib/db';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { z } from 'zod';

const downloadDocumentSchema = z.object({
  documentId: z.string(),
});

export const downloadKnowledgeBaseDocumentAction = authActionClient
  .inputSchema(downloadDocumentSchema)
  .metadata({
    name: 'download-knowledge-base-document',
    track: {
      event: 'download-knowledge-base-document',
      description: 'Download Knowledge Base Document',
      channel: 'server',
    },
  })
  .action(async ({ parsedInput, ctx }) => {
    const { documentId } = parsedInput;
    const { session } = ctx;

    if (!session?.activeOrganizationId) {
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
        error: 'Knowledge base bucket is not configured',
      };
    }

    try {
      const document = await db.knowledgeBaseDocument.findUnique({
        where: {
          id: documentId,
          organizationId: session.activeOrganizationId,
        },
        select: {
          s3Key: true,
          name: true,
          fileType: true,
        },
      });

      if (!document) {
        return {
          success: false,
          error: 'Document not found',
        };
      }

      // Generate signed URL for download
      const command = new GetObjectCommand({
        Bucket: APP_AWS_KNOWLEDGE_BASE_BUCKET,
        Key: document.s3Key,
        ResponseContentDisposition: `attachment; filename="${encodeURIComponent(document.name)}"`,
      });

      const signedUrl = await getSignedUrl(s3Client, command, {
        expiresIn: 3600, // URL expires in 1 hour
      });

      return {
        success: true,
        data: {
          signedUrl,
          fileName: document.name,
        },
      };
    } catch (error) {
      console.error('Error generating download URL:', error);
      return {
        success: false,
        error: 'Failed to generate download URL',
      };
    }
  });
