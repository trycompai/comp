'use client';

import { useCallback, useMemo, type Dispatch, type SetStateAction } from 'react';
import { useQuestionnaireActions } from '../useQuestionnaireActions';
import { useQuestionnaireAutoAnswer } from '../useQuestionnaireAutoAnswer';
import { useQuestionnaireSingleAnswer } from '../useQuestionnaireSingleAnswer';
import type { QuestionAnswer } from '../../components/types';
import { useQuestionnaireDetailState } from './useQuestionnaireDetailState';
import { useQuestionnaireDetailHandlers } from './useQuestionnaireDetailHandlers';
import type { UseQuestionnaireDetailProps } from './types';

export function useQuestionnaireDetail({
  questionnaireId,
  organizationId,
  initialQuestions,
}: UseQuestionnaireDetailProps) {
  const state = useQuestionnaireDetailState({
    initialQuestions,
    questionnaireId,
  });

  // Auto-answer hook
  const autoAnswer = useQuestionnaireAutoAnswer({
    results: state.results as QuestionAnswer[] | null,
    answeringQuestionIndex: state.answeringQuestionIndex,
    isAutoAnswerProcessStarted: state.isAutoAnswerProcessStarted,
    isAutoAnswerProcessStartedRef: state.isAutoAnswerProcessStartedRef,
    setIsAutoAnswerProcessStarted: state.setIsAutoAnswerProcessStarted,
    setResults: state.setResults as Dispatch<SetStateAction<QuestionAnswer[] | null>>,
    setQuestionStatuses: state.setQuestionStatuses as Dispatch<
      SetStateAction<Map<number, 'pending' | 'processing' | 'completed'>>
    >,
    setAnsweringQuestionIndex: state.setAnsweringQuestionIndex,
    questionnaireId,
  });

  // Wrapper for setResults that handles QuestionnaireResult[] with originalIndex
  const setResultsWrapper = useCallback((updater: SetStateAction<QuestionAnswer[] | null>) => {
    state.setResults((prevResults) => {
      if (!prevResults) {
        const newResults = typeof updater === 'function' ? updater(null) : updater;
        if (!newResults) return prevResults;
        return newResults.map((r, index) => ({
          question: r.question,
          answer: r.answer ?? null,
          originalIndex: index,
          sources: r.sources || [],
          questionAnswerId: '',
          status: 'untouched' as const,
          failedToGenerate: r.failedToGenerate ?? false,
        }));
      }

      const questionAnswerResults = prevResults.map((r) => ({
        question: r.question,
        answer: r.answer,
        sources: r.sources,
        failedToGenerate: (r as any).failedToGenerate ?? false,
        _originalIndex: r.originalIndex,
      }));

      const newResults =
        typeof updater === 'function' ? updater(questionAnswerResults) : updater;

      if (!newResults) return prevResults;

      return newResults.map((newR, index) => {
        const originalIndex =
          newR._originalIndex !== undefined ? newR._originalIndex : index;
        const existingResult = prevResults.find((r) => r.originalIndex === originalIndex);
        if (existingResult) {
          return {
            ...existingResult,
            question: newR.question,
            answer: newR.answer ?? null,
            sources: newR.sources,
            failedToGenerate: newR.failedToGenerate ?? false,
          };
        }
        return {
          question: newR.question,
          answer: newR.answer ?? null,
          originalIndex,
          sources: newR.sources || [],
          questionAnswerId: '',
          status: 'untouched' as const,
          failedToGenerate: newR.failedToGenerate ?? false,
        };
      });
    });
  }, [state.setResults]);

  // Single answer hook
  const singleAnswer = useQuestionnaireSingleAnswer({
    results: state.results.map((r) => ({
      question: r.question,
      answer: r.answer,
      sources: r.sources,
      failedToGenerate: (r as any).failedToGenerate ?? false,
      _originalIndex: r.originalIndex,
    })) as QuestionAnswer[],
    answeringQuestionIndices: state.answeringQuestionIndices,
    setResults: setResultsWrapper,
    setQuestionStatuses: state.setQuestionStatuses as Dispatch<
      SetStateAction<Map<number, 'pending' | 'processing' | 'completed'>>
    >,
    setAnsweringQuestionIndices: state.setAnsweringQuestionIndices,
    questionnaireId,
  });

  // Actions hook
  const actions = useQuestionnaireActions({
    orgId: organizationId,
    selectedFile: null,
    results: state.results as QuestionAnswer[] | null,
    editingAnswer: state.editingAnswer,
    expandedSources: state.expandedSources,
    setSelectedFile: () => {},
    setEditingIndex: state.setEditingIndex,
    setEditingAnswer: state.setEditingAnswer,
    setResults: state.setResults as Dispatch<SetStateAction<QuestionAnswer[] | null>>,
    setExpandedSources: state.setExpandedSources,
    isParseProcessStarted: state.isParseProcessStarted,
    setIsParseProcessStarted: state.setIsParseProcessStarted,
    setIsAutoAnswerProcessStarted: state.setIsAutoAnswerProcessStarted,
    isAutoAnswerProcessStartedRef: state.isAutoAnswerProcessStartedRef,
    setHasClickedAutoAnswer: state.setHasClickedAutoAnswer,
    answeringQuestionIndex: state.answeringQuestionIndex,
    setAnsweringQuestionIndex: state.setAnsweringQuestionIndex,
    setQuestionStatuses: state.setQuestionStatuses as Dispatch<
      SetStateAction<Map<number, 'pending' | 'processing' | 'completed'>>
    >,
    questionnaireId,
    setParseTaskId: () => {},
    setParseToken: () => {},
    uploadFileAction: { execute: async () => {}, status: 'idle' as const },
    parseAction: { execute: async () => {}, status: 'idle' as const },
    triggerAutoAnswer: autoAnswer.triggerAutoAnswer,
    triggerSingleAnswer: singleAnswer.triggerSingleAnswer,
  });

  // Handlers
  const handlers = useQuestionnaireDetailHandlers({
    questionnaireId,
    organizationId,
    results: state.results,
    answeringQuestionIndex: state.answeringQuestionIndex,
    isAutoAnswerProcessStarted: state.isAutoAnswerProcessStarted,
    isAutoAnswerProcessStartedRef: state.isAutoAnswerProcessStartedRef,
    setHasClickedAutoAnswer: state.setHasClickedAutoAnswer,
    setIsAutoAnswerProcessStarted: state.setIsAutoAnswerProcessStarted,
    setAnsweringQuestionIndex: state.setAnsweringQuestionIndex,
    setQuestionStatuses: state.setQuestionStatuses,
    setResults: state.setResults,
    editingAnswer: state.editingAnswer,
    setEditingIndex: state.setEditingIndex,
    setEditingAnswer: state.setEditingAnswer,
    setSavingIndex: state.setSavingIndex,
    router: state.router,
    triggerAutoAnswer: autoAnswer.triggerAutoAnswer,
    triggerSingleAnswer: singleAnswer.triggerSingleAnswer,
    answerQueue: state.answerQueue,
    setAnswerQueue: state.setAnswerQueue,
    answerQueueRef: state.answerQueueRef,
  });

  // Computed values
  const filteredResults = useMemo(() => {
    if (!state.searchQuery.trim()) return state.results;
    const query = state.searchQuery.toLowerCase();
    return state.results.filter(
      (r) =>
        r.question.toLowerCase().includes(query) ||
        (r.answer && r.answer.toLowerCase().includes(query))
    );
  }, [state.results, state.searchQuery]);

  const answeredCount = useMemo(() => {
    return state.results.filter((r) => r.answer && r.answer.trim().length > 0).length;
  }, [state.results]);

  const progressPercentage = useMemo(() => {
    if (state.results.length === 0) return 0;
    return Math.round((answeredCount / state.results.length) * 100);
  }, [answeredCount, state.results.length]);

  const isAutoAnswering = useMemo(() => {
    return (
      state.isAutoAnswerProcessStarted &&
      state.hasClickedAutoAnswer &&
      autoAnswer.isAutoAnswerTriggering
    );
  }, [
    state.isAutoAnswerProcessStarted,
    state.hasClickedAutoAnswer,
    autoAnswer.isAutoAnswerTriggering,
  ]);

  const isLoading = useMemo(() => {
    const hasProcessingQuestions = Array.from(state.questionStatuses.values()).some(
      (status) => status === 'processing'
    );
    const isSingleAnswerTriggering = singleAnswer.isSingleAnswerTriggering;
    const isAutoAnswerTriggering = autoAnswer.isAutoAnswerTriggering;

    return (
      hasProcessingQuestions ||
      isSingleAnswerTriggering ||
      isAutoAnswerTriggering
    );
  }, [
    state.questionStatuses,
    singleAnswer.isSingleAnswerTriggering,
    autoAnswer.isAutoAnswerTriggering,
  ]);

  const isSaving = state.savingIndex !== null;
  const savingIndex = state.savingIndex;

  return {
    orgId: organizationId,
    results: state.results,
    searchQuery: state.searchQuery,
    setSearchQuery: state.setSearchQuery,
    editingIndex: state.editingIndex,
    editingAnswer: state.editingAnswer,
    setEditingAnswer: state.setEditingAnswer,
    expandedSources: state.expandedSources,
    questionStatuses: state.questionStatuses,
    answeringQuestionIndex: state.answeringQuestionIndex,
    answerQueue: state.answerQueue,
    hasClickedAutoAnswer: state.hasClickedAutoAnswer,
    isLoading,
    isAutoAnswering,
    isExporting: actions.exportAction.status === 'executing',
    isSaving,
    savingIndex,
    filteredResults,
    answeredCount,
    totalCount: state.results.length,
    progressPercentage,
    handleAutoAnswer: handlers.handleAutoAnswer,
    handleAnswerSingleQuestion: handlers.handleAnswerSingleQuestion,
    handleEditAnswer: actions.handleEditAnswer,
    handleSaveAnswer: handlers.handleSaveAnswer,
    handleCancelEdit: actions.handleCancelEdit,
    handleExport: actions.handleExport,
    handleToggleSource: actions.handleToggleSource,
  };
}

