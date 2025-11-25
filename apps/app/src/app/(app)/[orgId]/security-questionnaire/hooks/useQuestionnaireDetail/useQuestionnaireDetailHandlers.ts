'use client';

import { useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import type { QuestionnaireResult } from './types';
import type { Dispatch, SetStateAction } from 'react';

interface UseQuestionnaireDetailHandlersProps {
  questionnaireId: string;
  organizationId: string;
  results: QuestionnaireResult[];
  answeringQuestionIndex: number | null;
  isAutoAnswerProcessStarted: boolean;
  isAutoAnswerProcessStartedRef: React.MutableRefObject<boolean>;
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
  saveIndexRef: React.MutableRefObject<number | null>;
  saveAnswerRef: React.MutableRefObject<string>;
  updateAnswerAction: {
    execute: (payload: {
      questionnaireId: string;
      questionAnswerId: string;
      answer: string;
    }) => void;
  };
  deleteAnswerAction: {
    execute: (
      payload: { questionnaireId: string; questionAnswerId: string }
    ) => Promise<any> | void;
  };
  router: { refresh: () => void };
  triggerAutoAnswer: (payload: {
    vendorId: string;
    organizationId: string;
    questionsAndAnswers: any[];
  }) => void;
  triggerSingleAnswer: (payload: {
    question: string;
    organizationId: string;
    questionIndex: number;
    totalQuestions: number;
  }) => void;
  answerQueue: number[];
  setAnswerQueue: Dispatch<SetStateAction<number[]>>;
  answerQueueRef: React.MutableRefObject<number[]>;
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
    saveIndexRef,
    saveAnswerRef,
  updateAnswerAction,
  deleteAnswerAction,
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
        vendorId: `org_${organizationId}`,
        organizationId,
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
      });
    });
  }, [results, organizationId, setAnswerQueue, setQuestionStatuses, triggerSingleAnswer]);

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
      await Promise.resolve(
        deleteAnswerAction.execute({
          questionnaireId,
          questionAnswerId,
        })
      );

      setResults((prev) =>
        prev.map((r) =>
          r.originalIndex === questionIndex
            ? { ...r, answer: '', status: 'untouched' as const }
            : r
        )
      );

      toast.success('Answer deleted. You can now generate a new answer.');
      router.refresh();
    } catch (error) {
      console.error('Failed to delete answer:', error);
      toast.error('Failed to delete answer');
    }
  };

  const handleSaveAnswer = (index: number) => {
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

    saveIndexRef.current = index;
    saveAnswerRef.current = editingAnswer;

    updateAnswerAction.execute({
      questionnaireId,
      questionAnswerId: result.questionAnswerId,
      answer: editingAnswer.trim(),
    });
  };

  return {
    handleAutoAnswer,
    handleAnswerSingleQuestion,
    handleDeleteAnswer,
    handleSaveAnswer,
  };
}

