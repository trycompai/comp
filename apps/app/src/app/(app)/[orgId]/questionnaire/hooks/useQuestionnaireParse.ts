'use client';

import { api } from '@/lib/api-client';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { createTriggerToken } from '../actions/create-trigger-token';
import type { QuestionAnswer } from '../components/types';

interface UseQuestionnaireParseProps {
  parseTaskId: string | null;
  parseToken: string | null;
  autoAnswerToken: string | null;
  setAutoAnswerToken: (token: string | null) => void;
  setIsParseProcessStarted: (started: boolean) => void;
  setParseTaskId: (id: string | null) => void;
  setParseToken: (token: string | null) => void;
  setResults: (results: QuestionAnswer[] | null) => void;
  setExtractedContent: (content: string | null) => void;
  setQuestionStatuses: React.Dispatch<
    React.SetStateAction<Map<number, 'pending' | 'processing' | 'completed'>>
  >;
  setHasClickedAutoAnswer: (clicked: boolean) => void;
  setQuestionnaireId: (id: string | null) => void;
  orgId: string;
}

type ParseStatus = 'idle' | 'executing';

export function useQuestionnaireParse({
  autoAnswerToken,
  setAutoAnswerToken,
  setIsParseProcessStarted,
  setQuestionnaireId,
  orgId,
}: UseQuestionnaireParseProps) {
  const router = useRouter();
  const [uploadStatus, setUploadStatus] = useState<ParseStatus>('idle');
  const [parseStatus, setParseStatus] = useState<ParseStatus>('idle');
  const abortControllerRef = useRef<AbortController | null>(null);

  // Get trigger token for auto-answer (can trigger and read)
  useEffect(() => {
    async function getAutoAnswerToken() {
      const result = await createTriggerToken('vendor-questionnaire-orchestrator');
      if (result.success && result.token) {
        setAutoAnswerToken(result.token);
      }
    }
    if (!autoAnswerToken) {
      getAutoAnswerToken();
    }
  }, [autoAnswerToken, setAutoAnswerToken]);

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
        const response = await api.post<{ questionnaireId: string; totalQuestions: number }>(
          '/v1/questionnaire/upload-and-parse',
          {
            organizationId: input.organizationId,
            fileName: input.fileName,
            fileType: input.fileType,
            fileData: input.fileData,
            source: 'internal',
          },
          input.organizationId,
        );

        if (response.error || !response.data) {
          setIsParseProcessStarted(false);
          toast.error(response.error || 'Failed to parse questionnaire');
          return;
        }

        const { questionnaireId, totalQuestions } = response.data;
        setQuestionnaireId(questionnaireId);
        toast.success(`Successfully parsed ${totalQuestions} questions`);
        router.push(`/${orgId}/questionnaire/${questionnaireId}`);
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          return; // Request was cancelled
        }
        setIsParseProcessStarted(false);
        console.error('Parse error:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to parse questionnaire');
      } finally {
        setUploadStatus('idle');
        setParseStatus('idle');
      }
    },
    [orgId, router, setIsParseProcessStarted, setQuestionnaireId],
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
