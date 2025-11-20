'use client';

import type { parseQuestionnaireTask } from '@/jobs/tasks/vendors/parse-questionnaire';
import { useRealtimeRun } from '@trigger.dev/react-hooks';
import { useAction } from 'next-safe-action/hooks';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { createRunReadToken, createTriggerToken } from '../actions/create-trigger-token';
import { parseQuestionnaireAI } from '../actions/parse-questionnaire-ai';
import { uploadQuestionnaireFile } from '../actions/upload-questionnaire-file';
import type { QuestionAnswer } from '../components/types';

interface UseQuestionnaireParseProps {
  parseTaskId: string | null;
  parseToken: string | null;
  autoAnswerToken: string | null;
  setAutoAnswerToken: (token: string | null) => void;
  singleAnswerToken: string | null;
  setSingleAnswerToken: (token: string | null) => void;
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

export function useQuestionnaireParse({
  parseTaskId,
  parseToken,
  autoAnswerToken,
  setAutoAnswerToken,
  singleAnswerToken,
  setSingleAnswerToken,
  setIsParseProcessStarted,
  setParseTaskId,
  setParseToken,
  setResults,
  setExtractedContent,
  setQuestionStatuses,
  setHasClickedAutoAnswer,
  setQuestionnaireId,
  orgId,
}: UseQuestionnaireParseProps) {
  const router = useRouter();
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

  // Get trigger token for single answer (can trigger and read)
  useEffect(() => {
    async function getSingleAnswerToken() {
      const result = await createTriggerToken('answer-question');
      if (result.success && result.token) {
        setSingleAnswerToken(result.token);
      }
    }
    if (!singleAnswerToken) {
      getSingleAnswerToken();
    }
  }, [singleAnswerToken, setSingleAnswerToken]);

  // Track parse task with realtime hook
  const { run: parseRun, error: parseError } = useRealtimeRun<typeof parseQuestionnaireTask>(
    parseTaskId || '',
    {
      accessToken: parseToken || undefined,
      enabled: !!parseTaskId && !!parseToken,
      onComplete: (run) => {
        setIsParseProcessStarted(false);

        if (run.output) {
          const questionsAndAnswers = run.output.questionsAndAnswers as
            | Array<{
                question: string;
                answer: string | null;
              }>
            | undefined;
          const extractedContent = run.output.extractedContent as string | undefined;
          const questionnaireId = run.output.questionnaireId as string | undefined;

          if (questionsAndAnswers && Array.isArray(questionsAndAnswers)) {
            const initializedResults = questionsAndAnswers.map((qa) => ({
              ...qa,
              failedToGenerate: false,
            }));
            setResults(initializedResults);
            setExtractedContent(extractedContent || null);
            setQuestionStatuses(new Map());
            setHasClickedAutoAnswer(false);
            if (questionnaireId) {
              setQuestionnaireId(questionnaireId);
              // Redirect to questionnaire detail page after successful parse
              setTimeout(() => {
                router.push(`/${orgId}/security-questionnaire/${questionnaireId}`);
              }, 500); // Small delay to show success toast
            }
            toast.success(
              `Successfully parsed ${questionsAndAnswers.length} question-answer pairs`,
            );
          } else {
            toast.error('Parsed data is missing questions');
          }
        }
      },
    },
  );

  // Handle parse errors
  useEffect(() => {
    if (parseError) {
      toast.error(`Failed to parse questionnaire: ${parseError.message}`);
    }
  }, [parseError]);

  // Handle parse task completion/failure
  useEffect(() => {
    if (parseRun?.status === 'FAILED' || parseRun?.status === 'CANCELED') {
      setIsParseProcessStarted(false);
      const errorMessage =
        parseRun.error instanceof Error
          ? parseRun.error.message
          : typeof parseRun.error === 'string'
            ? parseRun.error
            : 'Task failed or was canceled';
      toast.error(`Failed to parse questionnaire: ${errorMessage}`);
    }
  }, [parseRun?.status, parseRun?.error, setIsParseProcessStarted]);

  const parseAction = useAction(parseQuestionnaireAI, {
    onSuccess: async ({ data }: { data: any }) => {
      const responseData = data?.data || data;
      const taskId = responseData?.taskId as string | undefined;

      if (!taskId) {
        setIsParseProcessStarted(false);
        toast.error('Failed to start parse task');
        return;
      }

      // Clear old token before setting new task ID to prevent using wrong token with new run
      setParseToken(null);
      setParseTaskId(taskId);

      const tokenResult = await createRunReadToken(taskId);
      if (tokenResult.success && tokenResult.token) {
        setParseToken(tokenResult.token);
      } else {
        setIsParseProcessStarted(false);
        toast.error('Failed to create read token for parse task');
      }
    },
    onError: ({ error }) => {
      setIsParseProcessStarted(false);
      console.error('Parse action error:', error);
      toast.error(error.serverError || 'Failed to start parse questionnaire');
    },
  });

  const uploadFileAction = useAction(uploadQuestionnaireFile, {
    onSuccess: ({ data }: { data: any }) => {
      const responseData = data?.data || data;
      const s3Key = responseData?.s3Key;
      const fileName = responseData?.fileName;
      const fileType = responseData?.fileType;

      if (s3Key && fileType) {
        parseAction.execute({
          inputType: 's3',
          s3Key,
          fileName,
          fileType,
        });
      } else {
        toast.error('Failed to get S3 key after upload');
      }
    },
    onError: ({ error }) => {
      console.error('Upload action error:', error);
      toast.error(error.serverError || 'Failed to upload file');
    },
  });

  return {
    parseRun,
    parseError,
    parseAction,
    uploadFileAction,
  };
}
