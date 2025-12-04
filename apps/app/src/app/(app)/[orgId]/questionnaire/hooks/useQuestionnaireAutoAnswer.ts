'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import type { QuestionAnswer } from '../components/types';
import { env } from '@/env.mjs';
import { jwtManager } from '@/utils/jwt-manager';

interface UseQuestionnaireAutoAnswerProps {
  results: QuestionAnswer[] | null;
  answeringQuestionIndex: number | null;
  isAutoAnswerProcessStarted: boolean;
  isAutoAnswerProcessStartedRef: React.MutableRefObject<boolean>;
  setIsAutoAnswerProcessStarted: (started: boolean) => void;
  setResults: React.Dispatch<React.SetStateAction<QuestionAnswer[] | null>>;
  setQuestionStatuses: React.Dispatch<
    React.SetStateAction<Map<number, 'pending' | 'processing' | 'completed'>>
  >;
  setAnsweringQuestionIndex: (index: number | null) => void;
  questionnaireId: string | null;
}

export function useQuestionnaireAutoAnswer({
  results,
  answeringQuestionIndex,
  isAutoAnswerProcessStarted,
  isAutoAnswerProcessStartedRef,
  setIsAutoAnswerProcessStarted,
  setResults,
  setQuestionStatuses,
  setAnsweringQuestionIndex,
  questionnaireId,
}: UseQuestionnaireAutoAnswerProps) {
  const [isAutoAnswerTriggering, setIsAutoAnswerTriggering] = useState(false);
  const [autoAnswerError, setAutoAnswerError] = useState<Error | null>(null);
  const completedAnswersRef = useRef<Set<number>>(new Set());

  const triggerAutoAnswer = async (payload: {
    organizationId: string;
    questionnaireId?: string | null;
    questionsAndAnswers: Array<{
      question: string;
      answer: string | null;
      _originalIndex?: number;
      originalIndex?: number;
    }>;
  }) => {
    // Reset state
    setIsAutoAnswerTriggering(true);
    setAutoAnswerError(null);
    completedAnswersRef.current.clear();
    isAutoAnswerProcessStartedRef.current = true;
    setIsAutoAnswerProcessStarted(true);

    // Set all unanswered questions to processing
    // Use originalIndex/_originalIndex instead of array index to match SSE response questionIndex
    if (results) {
      setQuestionStatuses((prev) => {
        const newStatuses = new Map(prev);
        let hasChanges = false;
        results.forEach((result, index) => {
          if (!result.answer || result.answer.trim().length === 0) {
            // Use originalIndex/_originalIndex if available, otherwise fall back to array index
            const resultOriginalIndex = (result as QuestionAnswer & { originalIndex?: number; _originalIndex?: number }).originalIndex ?? 
                                       (result as QuestionAnswer & { originalIndex?: number; _originalIndex?: number })._originalIndex ?? 
                                       index;
            
            if (prev.get(resultOriginalIndex) !== 'processing') {
              newStatuses.set(resultOriginalIndex, 'processing');
              hasChanges = true;
            }
          }
        });
        return hasChanges ? newStatuses : prev;
      });
    }

    try {
      // Use fetch with ReadableStream for SSE (EventSource only supports GET)
      // credentials: 'include' is required to send cookies for authentication
      const token = await jwtManager.getValidToken();
      const response = await fetch(
        `${env.NEXT_PUBLIC_API_URL || 'http://localhost:3333'}/v1/questionnaire/auto-answer`,
        {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            'X-Organization-Id': payload.organizationId,
          },
        body: JSON.stringify({
            organizationId: payload.organizationId,
            questionnaireId: payload.questionnaireId ?? questionnaireId,
            questionsAndAnswers: payload.questionsAndAnswers.map((qa, index) => ({
              question: qa.question,
              answer: qa.answer ?? null,
              _originalIndex: qa._originalIndex ?? qa.originalIndex ?? index,
            })),
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('Response body is not readable');
      }

      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              switch (data.type) {
                case 'progress':
                  // Update progress if needed
                  break;

                case 'answer':
                  // Update individual answer as it completes
                  if (!completedAnswersRef.current.has(data.questionIndex)) {
                    completedAnswersRef.current.add(data.questionIndex);

                    setResults((prevResults) => {
                      if (!prevResults) return prevResults;

                      const updatedResults = [...prevResults];
                      const targetOriginalIndex = data.questionIndex; // This is the original question index

                      // Find the result by matching originalIndex (like useQuestionnaireSingleAnswer does)
                      let resultIndex = -1;
                      for (let i = 0; i < updatedResults.length; i++) {
                        const result = updatedResults[i] as QuestionAnswer & { originalIndex?: number; _originalIndex?: number };
                        // Check both originalIndex (from QuestionnaireResult) and _originalIndex (from QuestionAnswer)
                        if (result.originalIndex === targetOriginalIndex || result._originalIndex === targetOriginalIndex) {
                          resultIndex = i;
                          break;
                        }
                      }

                      // Fallback to array index if not found by originalIndex (for backward compatibility)
                      if (resultIndex === -1 && targetOriginalIndex >= 0 && targetOriginalIndex < updatedResults.length) {
                        resultIndex = targetOriginalIndex;
                      }

                      if (resultIndex >= 0 && resultIndex < updatedResults.length) {
                        const existingResult = updatedResults[resultIndex];
                        const originalQuestion = existingResult.question;

                        if (data.answer) {
                          updatedResults[resultIndex] = {
                            ...existingResult,
                            question: originalQuestion || data.question,
                            answer: data.answer,
                            sources: data.sources || [],
                            failedToGenerate: false,
                          };
                        } else {
                          const currentAnswer = existingResult.answer;
                          if (!currentAnswer) {
                            updatedResults[resultIndex] = {
                              ...existingResult,
                              question: originalQuestion || data.question,
                              answer: null,
                              failedToGenerate: true,
                            };
                          }
                        }
                      }

                      return updatedResults;
                    });

                    // Update status to completed using the original index
                    setQuestionStatuses((prev) => {
                      const newStatuses = new Map(prev);
                      newStatuses.set(data.questionIndex, 'completed');
                      return newStatuses;
                    });
                  }
                  break;

                case 'complete':
                  // All questions completed
                  setIsAutoAnswerTriggering(false);
                  isAutoAnswerProcessStartedRef.current = false;
                  setIsAutoAnswerProcessStarted(false);
                  setAnsweringQuestionIndex(null);

                  // Show final toast
                  const totalQuestions = data.total;
                  const answeredQuestions = data.answered;
                  const noAnswerQuestions = totalQuestions - answeredQuestions;

                  if (answeredQuestions > 0) {
                    toast.success(
                      `Answered ${answeredQuestions} of ${totalQuestions} question${totalQuestions > 1 ? 's' : ''}${noAnswerQuestions > 0 ? `. ${noAnswerQuestions} had insufficient information.` : '.'}`,
                    );
                  } else {
                    toast.warning(
                      `Could not find relevant information in your policies. Try adding more detail.`,
                    );
                  }
                  break;

                case 'error':
                  setIsAutoAnswerTriggering(false);
                  isAutoAnswerProcessStartedRef.current = false;
                  setIsAutoAnswerProcessStarted(false);
                  setAutoAnswerError(new Error(data.error || 'Unknown error'));
                  toast.error(`Failed to generate answers: ${data.error || 'Unknown error'}`);

                  // Mark all processing questions as completed on error
                  setQuestionStatuses((prev) => {
                    const newStatuses = new Map(prev);
                    prev.forEach((status, index) => {
                      if (status === 'processing') {
                        newStatuses.set(index, 'completed');
                      }
                    });
                    return newStatuses;
                  });
                  setAnsweringQuestionIndex(null);
                  break;
              }
            } catch (error) {
              console.error('Error parsing SSE data:', error);
            }
          }
        }
      }
    } catch (error) {
      setIsAutoAnswerTriggering(false);
      isAutoAnswerProcessStartedRef.current = false;
      setIsAutoAnswerProcessStarted(false);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setAutoAnswerError(new Error(errorMessage));
      toast.error(`Failed to generate answers: ${errorMessage}`);

      // Mark all processing questions as completed on error
      setQuestionStatuses((prev) => {
        const newStatuses = new Map(prev);
        prev.forEach((status, index) => {
          if (status === 'processing') {
            newStatuses.set(index, 'completed');
          }
        });
        return newStatuses;
      });
      setAnsweringQuestionIndex(null);
    }
  };

  const isAutoAnswering = useMemo(() => {
    return isAutoAnswerTriggering || isAutoAnswerProcessStarted;
  }, [isAutoAnswerTriggering, isAutoAnswerProcessStarted]);

  return {
    triggerAutoAnswer,
    autoAnswerRun: null, // No Trigger.dev run object
    autoAnswerError,
    isAutoAnswerTriggering,
    isAutoAnswering,
  };
}
