'use client';

import { isFailureRunStatus } from '@/app/(app)/[orgId]/cloud-tests/status';
import { api } from '@/lib/api-client';
import { useRealtimeRun } from '@trigger.dev/react-hooks';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';

const parseResultSchema = z.object({
  success: z.boolean(),
  questionnaireId: z.string(),
  questionsAndAnswers: z
    .array(z.object({ question: z.string(), answer: z.string().nullable() }))
    .optional(),
});

interface UseQuestionnaireParseProps {
  setIsParseProcessStarted: (started: boolean) => void;
  setQuestionnaireId: (id: string | null) => void;
  orgId: string;
}

type ParseStatus = 'idle' | 'executing';

export function useQuestionnaireParse({
  setIsParseProcessStarted,
  setQuestionnaireId,
  orgId,
}: UseQuestionnaireParseProps) {
  const router = useRouter();
  const [uploadStatus, setUploadStatus] = useState<ParseStatus>('idle');
  const [parseStatus, setParseStatus] = useState<ParseStatus>('idle');
  const [runId, setRunId] = useState<string | null>(null);
  const [runToken, setRunToken] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Track the parse task via realtime
  const { run: parseRun } = useRealtimeRun(runId ?? '', {
    accessToken: runToken ?? undefined,
    enabled: Boolean(runId && runToken),
  });

  // Handle task completion
  useEffect(() => {
    if (!parseRun?.status) return;

    if (parseRun.status === 'COMPLETED') {
      const parsedOutput = parseResultSchema.safeParse(parseRun.output);
      const output = parsedOutput.success ? parsedOutput.data : undefined;

      if (output?.success && output.questionnaireId) {
        setQuestionnaireId(output.questionnaireId);
        toast.success(`Successfully parsed ${output.questionsAndAnswers?.length ?? 0} questions`);
        router.push(`/${orgId}/questionnaire/${output.questionnaireId}`);
      } else {
        setIsParseProcessStarted(false);
        toast.error('Failed to parse questionnaire');
      }

      setRunId(null);
      setRunToken(null);
      setUploadStatus('idle');
      setParseStatus('idle');
    }

    if (isFailureRunStatus(parseRun.status)) {
      setIsParseProcessStarted(false);
      setRunId(null);
      setRunToken(null);
      setUploadStatus('idle');
      setParseStatus('idle');
      toast.error('Questionnaire parsing failed. Please try again.');
    }
  }, [
    parseRun?.status,
    parseRun?.output,
    orgId,
    router,
    setIsParseProcessStarted,
    setQuestionnaireId,
  ]);

  const executeUploadAndParse = useCallback(
    async (input: {
      fileName: string;
      fileType: string;
      fileData: string;
      organizationId: string;
    }) => {
      // Cancel any previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      setUploadStatus('executing');
      setParseStatus('executing');

      try {
        const response = await api.post<{
          runId: string;
          publicAccessToken: string;
        }>('/v1/questionnaire/upload-and-parse', {
          organizationId: input.organizationId,
          fileName: input.fileName,
          fileType: input.fileType,
          fileData: input.fileData,
          source: 'internal',
        });

        if (response.error || !response.data) {
          setIsParseProcessStarted(false);
          setUploadStatus('idle');
          setParseStatus('idle');
          toast.error(response.error || 'Failed to start questionnaire parsing');
          return;
        }

        // Upload done, now tracking async parsing
        setUploadStatus('idle');
        setRunId(response.data.runId);
        setRunToken(response.data.publicAccessToken);
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          return; // Request was cancelled
        }
        setIsParseProcessStarted(false);
        setUploadStatus('idle');
        setParseStatus('idle');
        console.error('Parse error:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to parse questionnaire');
      }
    },
    [setIsParseProcessStarted],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Simulated action objects to maintain compatibility with existing code
  const uploadFileAction = {
    status: uploadStatus,
    execute: (input: {
      fileName: string;
      fileType: string;
      fileData: string;
      organizationId: string;
    }) => {
      executeUploadAndParse(input);
    },
  };

  const parseAction = {
    status: parseStatus,
    execute: () => {
      // No-op - parsing is now handled in uploadFileAction
    },
  };

  return {
    parseRun: null,
    parseError: null,
    parseAction,
    uploadFileAction,
  };
}
