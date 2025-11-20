'use server';

import { authActionClient } from '@/actions/safe-action';
import { APP_AWS_KNOWLEDGE_BASE_BUCKET, s3Client } from '@/app/s3';
import { db } from '@db';
import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { tasks } from '@trigger.dev/sdk';
import { deleteKnowledgeBaseDocumentTask } from '@/jobs/tasks/vector/delete-knowledge-base-document';

const deleteDocumentSchema = z.object({
  documentId: z.string(),
});

export const deleteKnowledgeBaseDocumentAction = authActionClient
  .inputSchema(deleteDocumentSchema)
  .metadata({
    name: 'delete-knowledge-base-document',
    track: {
      event: 'delete-knowledge-base-document',
      description: 'Delete Knowledge Base Document',
      channel: 'server',
    },
  })
  .action(async ({ parsedInput, ctx }) => {
    const { documentId } = parsedInput;
    const { activeOrganizationId } = ctx.session;

    if (!activeOrganizationId) {
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
      // Find the document
      const document = await db.knowledgeBaseDocument.findUnique({
        where: {
          id: documentId,
          organizationId: activeOrganizationId,
        },
      });

      if (!document) {
        return {
          success: false,
          error: 'Document not found',
        };
      }

      // Delete embeddings from vector database first (async, non-blocking)
      let vectorDeletionRunId: string | undefined;
      try {
        const handle = await tasks.trigger<typeof deleteKnowledgeBaseDocumentTask>(
          'delete-knowledge-base-document-from-vector',
          {
            documentId: document.id,
            organizationId: activeOrganizationId,
          },
        );
        vectorDeletionRunId = handle.id;
      } catch (triggerError) {
        // Log error but continue with deletion
        console.error('Failed to trigger vector deletion task:', triggerError);
      }

      // Delete from S3
      try {
        const deleteCommand = new DeleteObjectCommand({
          Bucket: APP_AWS_KNOWLEDGE_BASE_BUCKET,
          Key: document.s3Key,
        });
        await s3Client.send(deleteCommand);
      } catch (s3Error) {
        // Log error but continue with database deletion
        console.error('Error deleting file from S3:', s3Error);
      }

      // Delete from database
      await db.knowledgeBaseDocument.delete({
        where: {
          id: documentId,
        },
      });

      revalidatePath(`/${activeOrganizationId}/security-questionnaire/knowledge-base`);

      return {
        success: true,
        vectorDeletionRunId, // Return run ID for tracking deletion progress
      };
    } catch (error) {
      console.error('Error deleting knowledge base document:', error);
      return {
        success: false,
        error: 'Failed to delete document',
      };
    }
  });

