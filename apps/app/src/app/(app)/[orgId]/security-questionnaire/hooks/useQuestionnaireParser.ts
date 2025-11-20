'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuestionnaireActions } from './useQuestionnaireActions';
import { useQuestionnaireAutoAnswer } from './useQuestionnaireAutoAnswer';
import { useQuestionnaireParse } from './useQuestionnaireParse';
import { useQuestionnaireSingleAnswer } from './useQuestionnaireSingleAnswer';
import { useQuestionnaireState } from './useQuestionnaireState';

export function useQuestionnaireParser() {
  const state = useQuestionnaireState();

  const parse = useQuestionnaireParse({
    parseTaskId: state.parseTaskId,
    parseToken: state.parseToken,
    autoAnswerToken: state.autoAnswerToken,
    setAutoAnswerToken: state.setAutoAnswerToken,
    singleAnswerToken: state.singleAnswerToken,
    setSingleAnswerToken: state.setSingleAnswerToken,
    setIsParseProcessStarted: state.setIsParseProcessStarted,
    setParseTaskId: state.setParseTaskId,
    setParseToken: state.setParseToken,
    setResults: state.setResults,
    setExtractedContent: state.setExtractedContent,
    setQuestionStatuses: state.setQuestionStatuses,
    setHasClickedAutoAnswer: state.setHasClickedAutoAnswer,
    setQuestionnaireId: state.setQuestionnaireId,
    orgId: state.orgId,
  });

  const autoAnswer = useQuestionnaireAutoAnswer({
    autoAnswerToken: state.autoAnswerToken,
    results: state.results,
    answeringQuestionIndex: state.answeringQuestionIndex,
    isAutoAnswerProcessStarted: state.isAutoAnswerProcessStarted,
    isAutoAnswerProcessStartedRef: state.isAutoAnswerProcessStartedRef,
    setIsAutoAnswerProcessStarted: state.setIsAutoAnswerProcessStarted,
    setResults: state.setResults,
    setQuestionStatuses: state.setQuestionStatuses,
    setAnsweringQuestionIndex: state.setAnsweringQuestionIndex,
    questionnaireId: state.questionnaireId,
  });

  const singleAnswer = useQuestionnaireSingleAnswer({
    singleAnswerToken: state.singleAnswerToken,
    results: state.results,
    answeringQuestionIndex: state.answeringQuestionIndex,
    setResults: state.setResults,
    setQuestionStatuses: state.setQuestionStatuses,
    setAnsweringQuestionIndex: state.setAnsweringQuestionIndex,
    questionnaireId: state.questionnaireId,
  });

  const actions = useQuestionnaireActions({
    orgId: state.orgId,
    selectedFile: state.selectedFile,
    results: state.results,
    editingAnswer: state.editingAnswer,
    expandedSources: state.expandedSources,
    questionnaireId: state.questionnaireId,
    setSelectedFile: state.setSelectedFile,
    setEditingIndex: state.setEditingIndex,
    setEditingAnswer: state.setEditingAnswer,
    setResults: state.setResults,
    setExpandedSources: state.setExpandedSources,
    setIsParseProcessStarted: state.setIsParseProcessStarted,
    setIsAutoAnswerProcessStarted: state.setIsAutoAnswerProcessStarted,
    isAutoAnswerProcessStartedRef: state.isAutoAnswerProcessStartedRef,
    setHasClickedAutoAnswer: state.setHasClickedAutoAnswer,
    answeringQuestionIndex: state.answeringQuestionIndex,
    setAnsweringQuestionIndex: state.setAnsweringQuestionIndex,
    setQuestionStatuses: state.setQuestionStatuses,
    setParseTaskId: state.setParseTaskId,
    setParseToken: state.setParseToken,
    uploadFileAction: parse.uploadFileAction,
    parseAction: parse.parseAction,
    triggerAutoAnswer: autoAnswer.triggerAutoAnswer,
    triggerSingleAnswer: singleAnswer.triggerSingleAnswer,
  });

  const isLoading = useMemo(() => {
    const isUploading = parse.uploadFileAction.status === 'executing';
    const isParseActionExecuting = parse.parseAction.status === 'executing';
    const isParseRunActive =
      parse.parseRun?.status === 'EXECUTING' ||
      parse.parseRun?.status === 'QUEUED' ||
      parse.parseRun?.status === 'WAITING';

    if (isParseRunActive) {
      return true;
    }

    if (isParseActionExecuting) {
      return true;
    }

    if (isUploading) {
      return true;
    }

    if (state.isParseProcessStarted && !parse.parseRun) {
      return true;
    }

    if (
      parse.parseRun?.status === 'COMPLETED' ||
      parse.parseRun?.status === 'FAILED' ||
      parse.parseRun?.status === 'CANCELED'
    ) {
      return false;
    }

    return false;
  }, [
    parse.uploadFileAction.status,
    parse.parseAction.status,
    parse.parseRun?.status,
    state.isParseProcessStarted,
    parse.parseRun,
  ]);

  const filteredResults = useMemo(() => {
    if (!state.results) return null;
    if (!state.searchQuery.trim()) return state.results;

    const query = state.searchQuery.toLowerCase();
    return state.results.filter(
      (qa) =>
        qa.question.toLowerCase().includes(query) ||
        (qa.answer && qa.answer.toLowerCase().includes(query)),
    );
  }, [state.results, state.searchQuery]);

  const answeredCount = useMemo(() => {
    return state.results?.filter((qa) => qa.answer).length || 0;
  }, [state.results]);

  const totalCount = state.results?.length || 0;
  const progressPercentage = totalCount > 0 ? Math.round((answeredCount / totalCount) * 100) : 0;

  const confirmReset = () => {
    state.resetState();
    state.setShowExitDialog(false);
  };

  // Get raw parsing status from actions/task
  const rawParseStatus = useMemo(() => {
    if (parse.uploadFileAction.status === 'executing') {
      return 'uploading';
    }
    if (parse.parseAction.status === 'executing') {
      return 'starting';
    }
    if (parse.parseRun?.status === 'QUEUED') {
      return 'queued';
    }
    if (parse.parseRun?.status === 'EXECUTING') {
      return 'analyzing';
    }
    if (parse.parseRun?.status === 'WAITING') {
      return 'processing';
    }
    // Keep showing status if parsing process started but no run yet
    if (state.isParseProcessStarted && !parse.parseRun) {
      return 'starting';
    }
    return null;
  }, [
    parse.uploadFileAction.status,
    parse.parseAction.status,
    parse.parseRun?.status,
    state.isParseProcessStarted,
    parse.parseRun,
  ]);

  // Throttled status for smooth transitions
  const [parseStatus, setParseStatus] = useState<
    'uploading' | 'starting' | 'queued' | 'analyzing' | 'processing' | null
  >(null);
  const statusTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastStatusRef = useRef<string | null>(null);
  const statusStartTimeRef = useRef<number | null>(null);

  useEffect(() => {
    // Clear any pending timeout
    if (statusTimeoutRef.current) {
      clearTimeout(statusTimeoutRef.current);
    }

    // If no status and not loading, reset
    if (!rawParseStatus && !isLoading) {
      setParseStatus(null);
      lastStatusRef.current = null;
      return;
    }

    // If loading but no raw status yet, keep showing last status or default
    if (isLoading && !rawParseStatus && parseStatus) {
      // Keep current status visible during loading
      return;
    }

    // If loading but no status at all, show default
    if (isLoading && !rawParseStatus && !parseStatus) {
      setParseStatus('starting');
      lastStatusRef.current = 'starting';
      return;
    }

    // If status changed, update after delay for smooth transition
    if (rawParseStatus && rawParseStatus !== lastStatusRef.current) {
      // If this is the first status, show immediately
      if (!lastStatusRef.current) {
        setParseStatus(rawParseStatus);
        lastStatusRef.current = rawParseStatus;
        statusStartTimeRef.current = Date.now();
      } else {
        // Check if current status has been visible for minimum duration
        const isEarlyStage =
          lastStatusRef.current === 'uploading' ||
          lastStatusRef.current === 'starting' ||
          lastStatusRef.current === 'queued';
        const minDisplayTime = isEarlyStage ? 3000 : 1500; // 3s minimum for early stages, 1.5s for later

        const timeSinceStatusStart = statusStartTimeRef.current
          ? Date.now() - statusStartTimeRef.current
          : 0;
        const remainingTime = Math.max(0, minDisplayTime - timeSinceStatusStart);

        statusTimeoutRef.current = setTimeout(() => {
          setParseStatus(rawParseStatus);
          lastStatusRef.current = rawParseStatus;
          statusStartTimeRef.current = Date.now();
        }, remainingTime);
      }
    } else if (rawParseStatus && rawParseStatus === lastStatusRef.current) {
      // Keep current status if it hasn't changed
      setParseStatus(rawParseStatus);
      // Update start time if it wasn't set
      if (!statusStartTimeRef.current) {
        statusStartTimeRef.current = Date.now();
      }
    }

    return () => {
      if (statusTimeoutRef.current) {
        clearTimeout(statusTimeoutRef.current);
      }
    };
  }, [rawParseStatus, isLoading, parseStatus]);

  return {
    orgId: state.orgId,
    selectedFile: state.selectedFile,
    setSelectedFile: state.setSelectedFile,
    showExitDialog: state.showExitDialog,
    parseStatus,
    setShowExitDialog: state.setShowExitDialog,
    results: state.results,
    extractedContent: state.extractedContent,
    searchQuery: state.searchQuery,
    setSearchQuery: state.setSearchQuery,
    editingIndex: state.editingIndex,
    editingAnswer: state.editingAnswer,
    setEditingAnswer: state.setEditingAnswer,
    expandedSources: state.expandedSources,
    questionStatuses: state.questionStatuses,
    answeringQuestionIndex: state.answeringQuestionIndex,
    hasClickedAutoAnswer: state.hasClickedAutoAnswer,
    isLoading,
    isAutoAnswering: autoAnswer.isAutoAnswering,
    isExporting: actions.exportAction.status === 'executing',
    filteredResults,
    answeredCount,
    totalCount,
    progressPercentage,
    handleFileSelect: actions.handleFileSelect,
    handleParse: actions.handleParse,
    confirmReset,
    handleAutoAnswer: actions.handleAutoAnswer,
    handleAnswerSingleQuestion: actions.handleAnswerSingleQuestion,
    handleEditAnswer: actions.handleEditAnswer,
    handleSaveAnswer: actions.handleSaveAnswer,
    handleCancelEdit: actions.handleCancelEdit,
    handleExport: actions.handleExport,
    handleToggleSource: actions.handleToggleSource,
  };
}
