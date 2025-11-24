'use client';

import { useAction } from 'next-safe-action/hooks';
import { answerSingleQuestionAction } from '../actions/answer-single-question';
import { saveAnswerAction } from '../actions/save-answer';
import type { QuestionAnswer } from '../components/types';
import { toast } from 'sonner';
import { useTransition, useEffect } from 'react';

interface UseQuestionnaireSingleAnswerProps {
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
  results,
  answeringQuestionIndex,
  setResults,
  setQuestionStatuses,
  setAnsweringQuestionIndex,
  questionnaireId,
}: UseQuestionnaireSingleAnswerProps) {
  // Use server action to answer single question directly
  const answerQuestion = useAction(answerSingleQuestionAction, {
    onSuccess: ({ data }) => {
      if (!data?.data || answeringQuestionIndex === null) return;

      const output = data.data;

      // Verify we're processing the correct question
      if (output.questionIndex !== answeringQuestionIndex) {
        return;
      }

      if (data.success && output.answer) {
        const targetIndex = output.questionIndex;

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

        // Save answer to database
        if (questionnaireId && output.answer) {
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
    },
    onError: ({ error }) => {
      if (answeringQuestionIndex !== null) {
        setQuestionStatuses((prev) => {
          const newStatuses = new Map(prev);
          newStatuses.set(answeringQuestionIndex, 'completed');
          return newStatuses;
        });
        setAnsweringQuestionIndex(null);
        toast.error(`Failed to generate answer: ${error.serverError || 'Unknown error'}`);
      }
    },
  });

  // Action for saving answer
  const saveAnswer = useAction(saveAnswerAction, {
    onError: ({ error }) => {
      console.error('Error saving answer:', error);
    },
  });

  const [isPending, startTransition] = useTransition();

  // Set status to processing when action is executing
  useEffect(() => {
    if (answeringQuestionIndex !== null && answerQuestion.status === 'executing') {
      setQuestionStatuses((prev) => {
        const newStatuses = new Map(prev);
        const currentStatus = prev.get(answeringQuestionIndex);
        if (currentStatus !== 'processing') {
          newStatuses.set(answeringQuestionIndex, 'processing');
          return newStatuses;
        }
        return prev;
      });
    }
  }, [answeringQuestionIndex, answerQuestion.status, setQuestionStatuses]);

  const triggerSingleAnswer = (payload: {
    question: string;
    organizationId: string;
    questionIndex: number;
    totalQuestions: number;
  }) => {
    answerQuestion.execute({
      question: payload.question,
      questionIndex: payload.questionIndex,
      totalQuestions: payload.totalQuestions,
    });
  };

  return {
    triggerSingleAnswer,
    isSingleAnswerTriggering: answerQuestion.status === 'executing',
  };
}

