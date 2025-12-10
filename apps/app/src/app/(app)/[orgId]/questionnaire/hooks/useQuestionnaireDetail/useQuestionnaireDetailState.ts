'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
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
  // Use Set to track multiple questions being processed in parallel
  const [answeringQuestionIndices, setAnsweringQuestionIndices] = useState<Set<number>>(new Set());
  
  // Keep answeringQuestionIndex for backward compatibility (will be removed)
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

  const [savingIndex, setSavingIndex] = useState<number | null>(null);

  // No longer need trigger tokens - using server actions instead of Trigger.dev

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
    answeringQuestionIndices,
    setAnsweringQuestionIndices,
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
    savingIndex,
    setSavingIndex,
    router,
    answerQueue,
    setAnswerQueue,
    answerQueueRef,
  };
}

