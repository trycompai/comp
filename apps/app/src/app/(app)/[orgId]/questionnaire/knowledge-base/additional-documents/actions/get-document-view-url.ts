'use server';

import { authActionClient } from '@/actions/safe-action';
import { APP_AWS_KNOWLEDGE_BASE_BUCKET, s3Client } from '@/app/s3';
import { db } from '@db';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { z } from 'zod';

const getDocumentViewUrlSchema = z.object({
  documentId: z.string(),
});

/**
 * Gets a signed URL for viewing a knowledge base document (opens in browser, doesn't force download)
 */
export const getKnowledgeBaseDocumentViewUrlAction = authActionClient
  .inputSchema(getDocumentViewUrlSchema)
  .metadata({
    name: 'get-knowledge-base-document-view-url',
    track: {
      event: 'get-knowledge-base-document-view-url',
      description: 'Get Knowledge Base Document View URL',
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

      // Generate signed URL for viewing in browser
      // Set Content-Type header so browser knows how to handle the file
      // For PDFs, images, and text files: browser will display inline
      // For DOCX, XLSX, etc.: browser may download or try to open with external app
      const command = new GetObjectCommand({
        Bucket: APP_AWS_KNOWLEDGE_BASE_BUCKET,
        Key: document.s3Key,
        ResponseContentDisposition: `inline; filename="${encodeURIComponent(document.name)}"`,
        ResponseContentType: document.fileType || 'application/octet-stream', // Set Content-Type header
      });

      const signedUrl = await getSignedUrl(s3Client, command, {
        expiresIn: 3600, // URL expires in 1 hour
      });

      // Determine if file can be viewed inline in browser
      const viewableInBrowser = [
        'application/pdf',
        'image/png',
        'image/jpeg',
        'image/jpg',
        'image/gif',
        'image/webp',
        'image/svg+xml',
        'text/plain',
        'text/html',
        'text/csv',
        'text/markdown',
      ].includes(document.fileType);

      return {
        success: true,
        data: {
          signedUrl,
          fileName: document.name,
          fileType: document.fileType,
          viewableInBrowser,
        },
      };
    } catch (error) {
      console.error('Error generating view URL:', error);
      return {
        success: false,
        error: 'Failed to generate view URL',
      };
    }
  });

