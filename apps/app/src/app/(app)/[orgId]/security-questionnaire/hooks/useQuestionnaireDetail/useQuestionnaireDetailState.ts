'use client';

import { useEffect, useRef, useState } from 'react';
import { useAction } from 'next-safe-action/hooks';
import { useRouter } from 'next/navigation';
import { updateQuestionnaireAnswer } from '../../actions/update-questionnaire-answer';
import { deleteQuestionnaireAnswer } from '../../actions/delete-questionnaire-answer';
import { createTriggerToken } from '../../actions/create-trigger-token';
import type { QuestionnaireResult, QuestionnaireQuestionAnswer } from './types';

interface UseQuestionnaireDetailStateProps {
  initialQuestions: QuestionnaireQuestionAnswer[];
  questionnaireId: string;
}

export function useQuestionnaireDetailState({
  initialQuestions,
  questionnaireId,
}: UseQuestionnaireDetailStateProps) {
  const router = useRouter();

  // Initialize results from database
  const [results, setResults] = useState<QuestionnaireResult[]>(() =>
    initialQuestions.map((q) => ({
      question: q.question,
      answer: q.answer ?? null,
      originalIndex: q.questionIndex,
      sources: q.sources ? (Array.isArray(q.sources) ? q.sources : []) : [],
      questionAnswerId: q.id,
      status: q.status,
      failedToGenerate: false,
    }))
  );

  // State management
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingAnswer, setEditingAnswer] = useState<string>('');
  const [expandedSources, setExpandedSources] = useState<Set<number>>(new Set());
  const [questionStatuses, setQuestionStatuses] = useState<
    Map<number, 'pending' | 'processing' | 'completed'>
  >(new Map());
  const [answeringQuestionIndex, setAnsweringQuestionIndex] = useState<number | null>(null);
  const [isAutoAnswerProcessStarted, setIsAutoAnswerProcessStarted] = useState(false);
  const [isParseProcessStarted, setIsParseProcessStarted] = useState(false);
  const [hasClickedAutoAnswer, setHasClickedAutoAnswer] = useState(false);
  const [autoAnswerToken, setAutoAnswerToken] = useState<string | null>(null);
  const [singleAnswerToken, setSingleAnswerToken] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const isAutoAnswerProcessStartedRef = useRef(false);
  
  // Queue for single question answers - allows users to click multiple questions
  // Questions will be processed sequentially
  const [answerQueue, setAnswerQueue] = useState<number[]>([]);
  const answerQueueRef = useRef<number[]>([]);

  // Refs to capture values for save callback
  const saveIndexRef = useRef<number | null>(null);
  const saveAnswerRef = useRef<string>('');

  // Actions
  const updateAnswerAction = useAction(updateQuestionnaireAnswer, {
    onSuccess: () => {
      if (saveIndexRef.current !== null) {
        const index = saveIndexRef.current;
        const answer = saveAnswerRef.current;

        setResults((prev) =>
          prev.map((r, i) => {
            if (i === index) {
              const trimmedAnswer = answer.trim();
              return {
                ...r,
                answer: trimmedAnswer || null,
                status: trimmedAnswer ? ('manual' as const) : ('untouched' as const),
                failedToGenerate: false,
                // Preserve sources when manually editing answer
                sources: r.sources || [],
              };
            }
            return r;
          })
        );

        setEditingIndex(null);
        setEditingAnswer('');
        router.refresh();

        saveIndexRef.current = null;
        saveAnswerRef.current = '';
      }
    },
    onError: ({ error }) => {
      console.error('Failed to update answer:', error);
      if (saveIndexRef.current !== null) {
        saveIndexRef.current = null;
        saveAnswerRef.current = '';
      }
    },
  });

  const deleteAnswerAction = useAction(deleteQuestionnaireAnswer);

  // Create trigger token for auto-answer (single question answers now use server action)
  useEffect(() => {
    const fetchToken = async () => {
      const autoTokenResult = await createTriggerToken('vendor-questionnaire-orchestrator');

      if (autoTokenResult.success && autoTokenResult.token) {
        setAutoAnswerToken(autoTokenResult.token);
      }
    };

    fetchToken();
  }, []);

  // Sync queue ref with state
  useEffect(() => {
    answerQueueRef.current = answerQueue;
  }, [answerQueue]);

  return {
    results,
    setResults,
    editingIndex,
    setEditingIndex,
    editingAnswer,
    setEditingAnswer,
    expandedSources,
    setExpandedSources,
    questionStatuses,
    setQuestionStatuses,
    answeringQuestionIndex,
    setAnsweringQuestionIndex,
    isAutoAnswerProcessStarted,
    setIsAutoAnswerProcessStarted,
    isParseProcessStarted,
    setIsParseProcessStarted,
    hasClickedAutoAnswer,
    setHasClickedAutoAnswer,
    autoAnswerToken,
    singleAnswerToken,
    searchQuery,
    setSearchQuery,
    isAutoAnswerProcessStartedRef,
    saveIndexRef,
    saveAnswerRef,
    updateAnswerAction,
    deleteAnswerAction,
    router,
    answerQueue,
    setAnswerQueue,
    answerQueueRef,
  };
}

