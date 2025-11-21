'use client';

import { useRealtimeTaskTrigger } from '@trigger.dev/react-hooks';
import type { answerQuestion } from '@/jobs/tasks/vendors/answer-question';
import { useEffect, useTransition } from 'react';
import { toast } from 'sonner';
import { useAction } from 'next-safe-action/hooks';
import { saveAnswerAction } from '../actions/save-answer';
import type { QuestionAnswer } from '../components/types';

interface UseQuestionnaireSingleAnswerProps {
  singleAnswerToken: string | null;
  results: QuestionAnswer[] | null;
  answeringQuestionIndex: number | null;
  setResults: React.Dispatch<React.SetStateAction<QuestionAnswer[] | null>>;
  setQuestionStatuses: React.Dispatch<
    React.SetStateAction<Map<number, 'pending' | 'processing' | 'completed'>>
  >;
  setAnsweringQuestionIndex: (index: number | null) => void;
  questionnaireId: string | null;
}

export function useQuestionnaireSingleAnswer({
  singleAnswerToken,
  results,
  answeringQuestionIndex,
  setResults,
  setQuestionStatuses,
  setAnsweringQuestionIndex,
  questionnaireId,
}: UseQuestionnaireSingleAnswerProps) {
  // Use realtime task trigger for single question answer
  const {
    submit: triggerSingleAnswer,
    run: singleAnswerRun,
    error: singleAnswerError,
    isLoading: isSingleAnswerTriggering,
  } = useRealtimeTaskTrigger<typeof answerQuestion>('answer-question', {
    accessToken: singleAnswerToken || undefined,
    enabled: !!singleAnswerToken,
  });

  // Action for saving answer
  const saveAnswer = useAction(saveAnswerAction, {
    onError: ({ error }) => {
      console.error('Error saving answer:', error);
    },
  });

  const [isPending, startTransition] = useTransition();

  // Set status to processing when task starts or is triggering
  useEffect(() => {
    if (answeringQuestionIndex !== null) {
      const shouldBeProcessing =
        isSingleAnswerTriggering ||
        singleAnswerRun?.status === 'EXECUTING' ||
        singleAnswerRun?.status === 'QUEUED' ||
        singleAnswerRun?.status === 'WAITING';

      if (shouldBeProcessing) {
        setQuestionStatuses((prev) => {
          const newStatuses = new Map(prev);
          // Ensure status is set to processing when task is running or triggering
          const currentStatus = prev.get(answeringQuestionIndex);
          if (currentStatus !== 'processing') {
            newStatuses.set(answeringQuestionIndex, 'processing');
            return newStatuses;
          }
          return prev;
        });
      }
    }
  }, [singleAnswerRun?.status, answeringQuestionIndex, isSingleAnswerTriggering, setQuestionStatuses]);

  // Handle single answer completion
  useEffect(() => {
    if (singleAnswerRun?.status === 'COMPLETED' && singleAnswerRun.output && answeringQuestionIndex !== null) {
      const output = singleAnswerRun.output as {
        success: boolean;
        questionIndex: number;
        question: string;
        answer: string | null;
        sources?: Array<{
          sourceType: string;
          sourceName?: string;
          score: number;
        }>;
      };

      // Verify we're processing the correct question
      if (output.questionIndex !== answeringQuestionIndex) {
        return; // Skip if this is not the question we're currently answering
      }

      if (output.success && output.answer) {
        const targetIndex = output.questionIndex;

        // Verify we're updating the correct question
        if (targetIndex === answeringQuestionIndex && targetIndex >= 0) {
          // Update the results with the answer
          setResults((prevResults) => {
            if (!prevResults) return prevResults;

            const updatedResults = [...prevResults];
            
            // Try to find by questionIndex first (for QuestionnaireResult with originalIndex)
            // Otherwise use array index
            let resultIndex = -1;
            for (let i = 0; i < updatedResults.length; i++) {
              const result = updatedResults[i] as any;
              if (result.originalIndex === targetIndex || result._originalIndex === targetIndex) {
                resultIndex = i;
                break;
              }
            }
            
            // Fallback to array index if not found by originalIndex
            if (resultIndex === -1 && targetIndex < updatedResults.length) {
              resultIndex = targetIndex;
            }
            
            if (resultIndex >= 0 && resultIndex < updatedResults.length) {
              const existingResult = updatedResults[resultIndex];
              updatedResults[resultIndex] = {
                ...existingResult,
                question: existingResult.question, // Preserve original question text
                answer: output.answer,
                sources: output.sources,
                failedToGenerate: false,
              };
              return updatedResults;
            }

            return prevResults;
          });

          // Save answer to database (outside of setState)
          if (questionnaireId && output.answer) {
            // Use startTransition to defer the save call to avoid rendering issues
            startTransition(() => {
              saveAnswer.execute({
                questionnaireId,
                questionIndex: targetIndex,
                answer: output.answer!,
                sources: output.sources,
                status: 'generated',
              });
            });
          }
        }

        // Mark question as completed
        setQuestionStatuses((prev) => {
          const newStatuses = new Map(prev);
          if (output.questionIndex === answeringQuestionIndex) {
            newStatuses.set(output.questionIndex, 'completed');
          }
          return newStatuses;
        });

        toast.success('Answer generated successfully');
      } else {
        // Mark as failed
        setResults((prevResults) => {
          if (!prevResults) return prevResults;

          const updatedResults = [...prevResults];
          const targetIndex = output.questionIndex;

          if (targetIndex === answeringQuestionIndex && targetIndex >= 0 && targetIndex < updatedResults.length) {
            updatedResults[targetIndex] = {
              ...updatedResults[targetIndex],
              failedToGenerate: true,
            };
            return updatedResults;
          }

          return prevResults;
        });

        setQuestionStatuses((prev) => {
          const newStatuses = new Map(prev);
          if (output.questionIndex === answeringQuestionIndex) {
            newStatuses.set(output.questionIndex, 'completed');
          }
          return newStatuses;
        });

        toast.warning('Could not find relevant information in your policies for this question.');
      }

      // Reset answering index
      setAnsweringQuestionIndex(null);
    }
  }, [singleAnswerRun?.status, singleAnswerRun?.output, answeringQuestionIndex, questionnaireId, saveAnswer, setResults, setQuestionStatuses, setAnsweringQuestionIndex]);

  // Handle single answer errors
  useEffect(() => {
    if (singleAnswerError && answeringQuestionIndex !== null) {
      setQuestionStatuses((prev) => {
        const newStatuses = new Map(prev);
        newStatuses.set(answeringQuestionIndex, 'completed');
        return newStatuses;
      });
      setAnsweringQuestionIndex(null);
      toast.error(`Failed to generate answer: ${singleAnswerError.message}`);
    }
  }, [singleAnswerError, answeringQuestionIndex, setQuestionStatuses, setAnsweringQuestionIndex]);

  // Handle task failures and cancellations
  useEffect(() => {
    if ((singleAnswerRun?.status === 'FAILED' || singleAnswerRun?.status === 'CANCELED') && answeringQuestionIndex !== null) {
      setQuestionStatuses((prev) => {
        const newStatuses = new Map(prev);
        newStatuses.set(answeringQuestionIndex, 'completed');
        return newStatuses;
      });
      setAnsweringQuestionIndex(null);
      
      const errorMessage =
        singleAnswerRun.error instanceof Error
          ? singleAnswerRun.error.message
          : typeof singleAnswerRun.error === 'string'
            ? singleAnswerRun.error
            : 'Task failed or was canceled';
      toast.error(`Failed to generate answer: ${errorMessage}`);
    }
  }, [singleAnswerRun?.status, singleAnswerRun?.error, answeringQuestionIndex, setQuestionStatuses, setAnsweringQuestionIndex]);

  return {
    triggerSingleAnswer,
    isSingleAnswerTriggering,
  };
}

