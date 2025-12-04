'use client';

import type { QuestionAnswer } from '../components/types';
import { toast } from 'sonner';
import { useRef } from 'react';
import { api } from '@/lib/api-client';

interface UseQuestionnaireSingleAnswerProps {
  results: QuestionAnswer[] | null;
  answeringQuestionIndices: Set<number>;
  setResults: React.Dispatch<React.SetStateAction<QuestionAnswer[] | null>>;
  setQuestionStatuses: React.Dispatch<
    React.SetStateAction<Map<number, 'pending' | 'processing' | 'completed'>>
  >;
  setAnsweringQuestionIndices: React.Dispatch<React.SetStateAction<Set<number>>>;
  questionnaireId: string | null;
}

export function useQuestionnaireSingleAnswer({
  results,
  answeringQuestionIndices,
  setResults,
  setQuestionStatuses,
  setAnsweringQuestionIndices,
  questionnaireId,
}: UseQuestionnaireSingleAnswerProps) {
  // Track active requests to prevent duplicate calls
  const activeRequestsRef = useRef<Set<number>>(new Set());

  // Action for saving answer
  const triggerSingleAnswer = async (payload: {
    question: string;
    organizationId: string;
    questionIndex: number;
    totalQuestions: number;
    questionnaireId?: string | null;
  }) => {
    const { questionIndex } = payload;

    // Prevent duplicate requests for the same question
    if (activeRequestsRef.current.has(questionIndex)) {
      return;
    }

    // Add to active requests and answering indices
    activeRequestsRef.current.add(questionIndex);
    setAnsweringQuestionIndices((prev) => new Set(prev).add(questionIndex));

    // Set status to processing
    setQuestionStatuses((prev) => {
      const newStatuses = new Map(prev);
      newStatuses.set(questionIndex, 'processing');
      return newStatuses;
    });

    try {
      // Call server action directly via fetch for parallel processing
      const response = await api.post<{
        success: boolean;
        data?: {
          questionIndex: number;
          question: string;
          answer: string | null;
          sources?: QuestionAnswer['sources'];
          error?: string;
        };
        error?: string;
      }>(
        '/v1/questionnaire/answer-single',
        {
          question: payload.question,
          questionIndex: payload.questionIndex,
          totalQuestions: payload.totalQuestions,
          organizationId: payload.organizationId,
          questionnaireId: payload.questionnaireId,
        },
        payload.organizationId,
      );

      if (response.error || !response.data) {
        throw new Error(response.error || 'Failed to generate answer');
      }

      const result = response.data;

      if (result.success && result.data?.answer) {
        const output = result.data;
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
        // Mark question as completed
        setQuestionStatuses((prev) => {
          const newStatuses = new Map(prev);
          newStatuses.set(output.questionIndex, 'completed');
          return newStatuses;
        });

        toast.success('Answer generated successfully');
      } else {
        // Mark as failed
        setResults((prevResults) => {
          if (!prevResults) return prevResults;

          const updatedResults = [...prevResults];
          const targetIndex = result.data?.questionIndex ?? questionIndex;

          if (targetIndex >= 0 && targetIndex < updatedResults.length) {
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
          newStatuses.set(questionIndex, 'completed');
          return newStatuses;
        });

        toast.warning('Could not find relevant information in your policies for this question.');
      }
    } catch (error) {
      setQuestionStatuses((prev) => {
        const newStatuses = new Map(prev);
        newStatuses.set(questionIndex, 'completed');
        return newStatuses;
      });

      toast.error(`Failed to generate answer: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      // Remove from active requests and answering indices
      activeRequestsRef.current.delete(questionIndex);
      setAnsweringQuestionIndices((prev) => {
        const newSet = new Set(prev);
        newSet.delete(questionIndex);
        return newSet;
      });
    }
  };

  const isSingleAnswerTriggering = answeringQuestionIndices.size > 0;

  return {
    triggerSingleAnswer,
    isSingleAnswerTriggering,
  };
}
