'use client';

import { useRealtimeRun } from '@trigger.dev/react-hooks';
import { useCallback, useEffect, useRef } from 'react';

interface UseDocumentProcessingOptions {
  processingRunId?: string | null;
  processingToken?: string | null;
  deletionRunId?: string | null;
  deletionToken?: string | null;
  onProcessingComplete?: () => void;
  onDeletionComplete?: () => void;
}

/**
 * Hook to track document processing and deletion runs using Trigger.dev realtime
 *
 * The tokens should be obtained from the API response (e.g., from processDocuments or deleteDocument endpoints)
 * which return `publicAccessToken` along with the `runId`.
 */
export function useDocumentProcessing({
  processingRunId,
  processingToken,
  deletionRunId,
  deletionToken,
  onProcessingComplete,
  onDeletionComplete,
}: UseDocumentProcessingOptions) {
  // Use refs to avoid stale closure issues
  const onProcessingCompleteRef = useRef(onProcessingComplete);
  const onDeletionCompleteRef = useRef(onDeletionComplete);

  // Keep refs updated
  useEffect(() => {
    onProcessingCompleteRef.current = onProcessingComplete;
  }, [onProcessingComplete]);

  useEffect(() => {
    onDeletionCompleteRef.current = onDeletionComplete;
  }, [onDeletionComplete]);

  // Stable callbacks that use refs
  const handleProcessingComplete = useCallback(() => {
    onProcessingCompleteRef.current?.();
  }, []);

  const handleDeletionComplete = useCallback(() => {
    onDeletionCompleteRef.current?.();
  }, []);

  // Track processing run
  const { run: processingRun } = useRealtimeRun(processingRunId || '', {
    accessToken: processingToken || undefined,
    enabled: !!processingRunId && !!processingToken,
    onComplete: handleProcessingComplete,
  });

  // Track deletion run
  const { run: deletionRun } = useRealtimeRun(deletionRunId || '', {
    accessToken: deletionToken || undefined,
    enabled: !!deletionRunId && !!deletionToken,
    onComplete: handleDeletionComplete,
  });

  // Check if processing is active (handle orchestrator child tasks)
  const isProcessing = processingRun
    ? ['EXECUTING', 'QUEUED', 'PENDING', 'WAITING'].includes(processingRun.status)
    : false;

  const isDeleting = deletionRun
    ? ['EXECUTING', 'QUEUED', 'PENDING', 'WAITING'].includes(deletionRun.status)
    : false;

  return {
    processingRun,
    deletionRun,
    isProcessing,
    isDeleting,
    processingStatus: processingRun?.status,
    deletionStatus: deletionRun?.status,
  };
}
