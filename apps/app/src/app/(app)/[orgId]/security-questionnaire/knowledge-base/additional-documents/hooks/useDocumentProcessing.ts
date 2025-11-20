'use client';

import { useRealtimeRun } from '@trigger.dev/react-hooks';
import { useEffect, useState } from 'react';
import { createRunReadToken } from '../../../actions/create-trigger-token';
import type { processKnowledgeBaseDocumentTask } from '@/jobs/tasks/vector/process-knowledge-base-document';
import type { processKnowledgeBaseDocumentsOrchestratorTask } from '@/jobs/tasks/vector/process-knowledge-base-documents-orchestrator';
import type { deleteKnowledgeBaseDocumentTask } from '@/jobs/tasks/vector/delete-knowledge-base-document';

interface UseDocumentProcessingOptions {
  processingRunId?: string | null;
  deletionRunId?: string | null;
  onProcessingComplete?: () => void;
  onDeletionComplete?: () => void;
}

export function useDocumentProcessing({
  processingRunId,
  deletionRunId,
  onProcessingComplete,
  onDeletionComplete,
}: UseDocumentProcessingOptions) {
  const [processingToken, setProcessingToken] = useState<string | null>(null);
  const [deletionToken, setDeletionToken] = useState<string | null>(null);

  // Get read token for processing run
  useEffect(() => {
    async function getProcessingToken() {
      if (processingRunId) {
        const result = await createRunReadToken(processingRunId);
        if (result.success && result.token) {
          setProcessingToken(result.token);
        }
      }
    }
    getProcessingToken();
  }, [processingRunId]);

  // Get read token for deletion run
  useEffect(() => {
    async function getDeletionToken() {
      if (deletionRunId) {
        const result = await createRunReadToken(deletionRunId);
        if (result.success && result.token) {
          setDeletionToken(result.token);
        }
      }
    }
    getDeletionToken();
  }, [deletionRunId]);

  // Track processing run
  const { run: processingRun } = useRealtimeRun<
    typeof processKnowledgeBaseDocumentTask | typeof processKnowledgeBaseDocumentsOrchestratorTask
  >(processingRunId || '', {
    accessToken: processingToken || undefined,
    enabled: !!processingRunId && !!processingToken,
    onComplete: () => {
      onProcessingComplete?.();
    },
  });

  // Track deletion run
  const { run: deletionRun } = useRealtimeRun<typeof deleteKnowledgeBaseDocumentTask>(
    deletionRunId || '',
    {
      accessToken: deletionToken || undefined,
      enabled: !!deletionRunId && !!deletionToken,
      onComplete: () => {
        onDeletionComplete?.();
      },
    },
  );

  return {
    processingRun,
    deletionRun,
    isProcessing: processingRun?.status === 'EXECUTING' || processingRun?.status === 'QUEUED',
    isDeleting: deletionRun?.status === 'EXECUTING' || deletionRun?.status === 'QUEUED',
    processingStatus: processingRun?.status,
    deletionStatus: deletionRun?.status,
  };
}

