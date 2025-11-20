'use server';

import { authActionClient } from '@/actions/safe-action';
import { tasks } from '@trigger.dev/sdk';
import { processKnowledgeBaseDocumentTask } from '@/jobs/tasks/vector/process-knowledge-base-document';
import { processKnowledgeBaseDocumentsOrchestratorTask } from '@/jobs/tasks/vector/process-knowledge-base-documents-orchestrator';
import { z } from 'zod';

const processDocumentsSchema = z.object({
  documentIds: z.array(z.string()).min(1),
  organizationId: z.string(),
});

/**
 * Server action to trigger document processing
 * Uses orchestrator for multiple documents, individual task for single document
 */
export const processKnowledgeBaseDocumentsAction = authActionClient
  .inputSchema(processDocumentsSchema)
  .metadata({
    name: 'process-knowledge-base-documents',
    track: {
      event: 'process-knowledge-base-documents',
      description: 'Process Knowledge Base Documents',
      channel: 'server',
    },
  })
  .action(async ({ parsedInput, ctx }) => {
    const { documentIds, organizationId } = parsedInput;
    const { session } = ctx;

    if (!session?.activeOrganizationId || session.activeOrganizationId !== organizationId) {
      return {
        success: false,
        error: 'Not authorized',
      };
    }

    try {
      let runId: string | undefined;
      
      // Use orchestrator for multiple documents, individual task for single document
      if (documentIds.length > 1) {
        const handle = await tasks.trigger<typeof processKnowledgeBaseDocumentsOrchestratorTask>(
          'process-knowledge-base-documents-orchestrator',
          {
            documentIds,
            organizationId,
          },
        );
        runId = handle.id;
      } else {
        const handle = await tasks.trigger<typeof processKnowledgeBaseDocumentTask>(
          'process-knowledge-base-document',
          {
            documentId: documentIds[0]!,
            organizationId,
          },
        );
        runId = handle.id;
      }

      return {
        success: true,
        runId,
        message: documentIds.length > 1 
          ? `Processing ${documentIds.length} documents in parallel...`
          : 'Processing document...',
      };
    } catch (error) {
      console.error('Failed to trigger document processing:', error);
      return {
        success: false,
        error: 'Failed to trigger document processing',
      };
    }
  });

