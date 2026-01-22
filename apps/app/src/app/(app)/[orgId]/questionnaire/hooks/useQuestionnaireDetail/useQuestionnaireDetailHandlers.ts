'use client';

import { useCallback, useEffect, type MutableRefObject } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api-client';
import type { QuestionnaireResult } from './types';
import type { Dispatch, SetStateAction } from 'react';

interface UseQuestionnaireDetailHandlersProps {
  questionnaireId: string;
  organizationId: string;
  results: QuestionnaireResult[];
  answeringQuestionIndex: number | null;
  isAutoAnswerProcessStarted: boolean;
  isAutoAnswerProcessStartedRef: MutableRefObject<boolean>;
  setHasClickedAutoAnswer: (clicked: boolean) => void;
  setIsAutoAnswerProcessStarted: (started: boolean) => void;
  setAnsweringQuestionIndex: (index: number | null) => void;
  setQuestionStatuses: Dispatch<
    SetStateAction<Map<number, 'pending' | 'processing' | 'completed'>>
  >;
  setResults: Dispatch<SetStateAction<QuestionnaireResult[]>>;
  editingAnswer: string;
  setEditingIndex: (index: number | null) => void;
  setEditingAnswer: (answer: string) => void;
  setSavingIndex: (index: number | null) => void;
  router: { refresh: () => void };
  triggerAutoAnswer: (payload: {
    organizationId: string;
    questionsAndAnswers: any[];
    questionnaireId?: string;
  }) => void;
  triggerSingleAnswer: (payload: {
    question: string;
    organizationId: string;
    questionIndex: number;
    totalQuestions: number;
    questionnaireId?: string;
  }) => void;
  answerQueue: number[];
  setAnswerQueue: Dispatch<SetStateAction<number[]>>;
  answerQueueRef: MutableRefObject<number[]>;
}

export function useQuestionnaireDetailHandlers({
  questionnaireId,
  organizationId,
  results,
  answeringQuestionIndex,
  isAutoAnswerProcessStarted,
  isAutoAnswerProcessStartedRef,
  setHasClickedAutoAnswer,
  setIsAutoAnswerProcessStarted,
  setAnsweringQuestionIndex,
    setQuestionStatuses,
    setResults,
    editingAnswer,
    setEditingIndex,
    setEditingAnswer,
  setSavingIndex,
  router,
  triggerAutoAnswer,
  triggerSingleAnswer,
  answerQueue,
  setAnswerQueue,
  answerQueueRef,
}: UseQuestionnaireDetailHandlersProps) {
  const handleAutoAnswer = () => {
    if (answeringQuestionIndex !== null) {
      toast.warning('Please wait for the current question to finish before answering all questions');
      return;
    }

    // Clear queue when starting batch operation
    setAnswerQueue([]);

    setHasClickedAutoAnswer(true);
    setIsAutoAnswerProcessStarted(true);
    isAutoAnswerProcessStartedRef.current = true;

    const questionsToAnswer = results
      .filter((r) => r.status !== 'manual' && (!r.answer || r.answer.trim().length === 0))
      .map((r) => ({
        question: r.question,
        answer: r.answer || null,
        _originalIndex: r.originalIndex,
      }));

    if (questionsToAnswer.length === 0) {
      toast.info('All questions already have answers');
      setIsAutoAnswerProcessStarted(false);
      isAutoAnswerProcessStartedRef.current = false;
      return;
    }

    setQuestionStatuses((prev) => {
      const newStatuses = new Map(prev);
      questionsToAnswer.forEach((q) => {
        if (q._originalIndex !== undefined) {
          newStatuses.set(q._originalIndex, 'processing');
        }
      });
      return newStatuses;
    });

    try {
      triggerAutoAnswer({
        organizationId,
        questionnaireId,
        questionsAndAnswers: questionsToAnswer.map((q) => ({
          question: q.question,
          answer: q.answer,
          _originalIndex: q._originalIndex,
        })) as any,
      });
    } catch (error) {
      console.error('Failed to trigger auto-answer:', error);
      toast.error('Failed to start auto-answer process');
      setIsAutoAnswerProcessStarted(false);
      isAutoAnswerProcessStartedRef.current = false;
      setQuestionStatuses((prev) => {
        const newStatuses = new Map(prev);
        questionsToAnswer.forEach((q) => {
          if (q._originalIndex !== undefined) {
            newStatuses.delete(q._originalIndex);
          }
        });
        return newStatuses;
      });
    }
  };

  const processNextInQueue = useCallback(() => {
    // Get the next question from queue
    const queue = answerQueueRef.current;
    if (queue.length === 0) {
      return;
    }

    // Process all questions in queue in parallel (no blocking)
    queue.forEach((nextIndex) => {
      const result = results.find((r) => r.originalIndex === nextIndex);
      
      if (!result) {
        // Remove invalid index from queue
        setAnswerQueue((prev) => prev.filter((idx) => idx !== nextIndex));
        return;
      }

      // Skip if already answered manually
      if (result.status === 'manual' && result.answer && result.answer.trim().length > 0) {
        // Remove from queue
        setAnswerQueue((prev) => prev.filter((idx) => idx !== nextIndex));
        return;
      }

      // Remove from queue and start processing immediately (parallel)
      setAnswerQueue((prev) => prev.filter((idx) => idx !== nextIndex));

      setQuestionStatuses((prev) => {
        const newStatuses = new Map(prev);
        newStatuses.set(nextIndex, 'processing');
        return newStatuses;
      });

      triggerSingleAnswer({
        question: result.question,
        organizationId,
        questionIndex: nextIndex,
        totalQuestions: results.length,
        questionnaireId,
      });
    });
  }, [results, organizationId, questionnaireId, setAnswerQueue, setQuestionStatuses, triggerSingleAnswer]);

  const handleAnswerSingleQuestion = (index: number) => {
    // Don't allow adding to queue if batch operation is running
    if (isAutoAnswerProcessStarted) {
      return;
    }

    const result = results.find((r) => r.originalIndex === index);
    if (!result) {
      return;
    }

    // Skip if already answered manually
    if (result.status === 'manual' && result.answer && result.answer.trim().length > 0) {
      return;
    }

    // Check if already in queue
    const queue = answerQueueRef.current;
    if (queue.includes(index)) {
      return; // Already queued
    }

    // Check if currently being processed
    if (answeringQuestionIndex === index) {
      return; // Already processing (backward compatibility check)
    }

    // Start processing immediately (no queue needed for parallel processing)
    setQuestionStatuses((prev) => {
      const newStatuses = new Map(prev);
      newStatuses.set(index, 'processing');
      return newStatuses;
    });

    triggerSingleAnswer({
      question: result.question,
      organizationId,
      questionIndex: index,
      totalQuestions: results.length,
      questionnaireId,
    });
  };

  // Process questions in queue (no longer needed for parallel processing, but kept for backward compatibility)
  useEffect(() => {
    if (answerQueue.length > 0) {
      processNextInQueue();
    }
  }, [answerQueue.length, processNextInQueue]);

  const handleDeleteAnswer = async (questionAnswerId: string, questionIndex: number) => {
    try {
      const response = await api.post(
        '/v1/questionnaire/delete-answer',
        {
          questionnaireId,
          questionAnswerId,
          organizationId,
        },
        organizationId,
      );

      if (response.error) {
        console.error('Failed to delete answer:', response.error);
        toast.error(response.error || 'Failed to delete answer');
        return;
      }

      setResults((prev) =>
        prev.map((r) =>
          r.originalIndex === questionIndex
            ? { ...r, answer: '', status: 'untouched' as const, sources: [] }
            : r,
        ),
      );

      toast.success('Answer deleted. You can now generate a new answer.');
      router.refresh();
    } catch (error) {
      console.error('Failed to delete answer:', error);
      toast.error('Failed to delete answer');
    }
  };

  const handleSaveAnswer = async (index: number) => {
    const result = results[index];

    if (!result) {
      console.error('Cannot save answer: result not found at index', {
        index,
        resultsLength: results.length,
        results: results.map((r, i) => ({
          i,
          originalIndex: r.originalIndex,
          questionAnswerId: r.questionAnswerId,
        })),
      });
      toast.error('Cannot find question to save');
      return;
    }

    if (!result.questionAnswerId) {
      console.error('Cannot save answer: questionAnswerId not found', { index, result });
      toast.error('Cannot save answer: missing question ID');
      return;
    }

    const trimmedAnswer = editingAnswer.trim();
    setSavingIndex(index);

    try {
      const response = await api.post(
        '/v1/questionnaire/save-answer',
        {
      questionnaireId,
      questionAnswerId: result.questionAnswerId,
          organizationId,
          answer: trimmedAnswer,
          status: 'manual',
          questionIndex: result.originalIndex,
        },
        organizationId,
      );

      if (response.error) {
        console.error('Failed to save answer:', response.error);
        toast.error(response.error || 'Failed to save answer');
        return;
      }

      setResults((prev) =>
        prev.map((r, i) => {
          if (i === index) {
            return {
              ...r,
              answer: trimmedAnswer || null,
              status: trimmedAnswer ? ('manual' as const) : ('untouched' as const),
              failedToGenerate: false,
              sources: r.sources || [],
            };
          }
          return r;
        }),
      );

      setEditingIndex(null);
      setEditingAnswer('');
      toast.success('Answer saved');
    } catch (error) {
      console.error('Failed to save answer:', error);
      toast.error('Failed to save answer');
    } finally {
      setSavingIndex(null);
    }
  };

  return {
    handleAutoAnswer,
    handleAnswerSingleQuestion,
    handleDeleteAnswer,
    handleSaveAnswer,
  };
}

