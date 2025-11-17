'use client';

import { useAction } from 'next-safe-action/hooks';
import { useCallback } from 'react';
import type { FileRejection } from 'react-dropzone';
import { toast } from 'sonner';
import { exportQuestionnaire } from '../actions/export-questionnaire';
import type { QuestionAnswer } from '../components/types';

interface UseQuestionnaireActionsProps {
  orgId: string;
  selectedFile: File | null;
  results: QuestionAnswer[] | null;
  editingAnswer: string;
  expandedSources: Set<number>;
  setSelectedFile: (file: File | null) => void;
  setEditingIndex: (index: number | null) => void;
  setEditingAnswer: (answer: string) => void;
  setResults: React.Dispatch<React.SetStateAction<QuestionAnswer[] | null>>;
  setExpandedSources: React.Dispatch<React.SetStateAction<Set<number>>>;
  setIsParseProcessStarted: (started: boolean) => void;
  setIsAutoAnswerProcessStarted: (started: boolean) => void;
  isAutoAnswerProcessStartedRef: React.MutableRefObject<boolean>;
  setHasClickedAutoAnswer: (clicked: boolean) => void;
  answeringQuestionIndex: number | null;
  setAnsweringQuestionIndex: (index: number | null) => void;
  setQuestionStatuses: React.Dispatch<
    React.SetStateAction<Map<number, 'pending' | 'processing' | 'completed'>>
  >;
      uploadFileAction: {
        execute: (payload: any) => void;
        status: 'idle' | 'executing' | 'hasSucceeded' | 'hasErrored' | 'transitioning' | 'hasNavigated';
      };
      parseAction: {
        execute: (payload: any) => void;
        status: 'idle' | 'executing' | 'hasSucceeded' | 'hasErrored' | 'transitioning' | 'hasNavigated';
      };
      triggerAutoAnswer: (payload: {
        vendorId: string;
        organizationId: string;
        questionsAndAnswers: QuestionAnswer[];
      }) => void;
      triggerSingleAnswer: (payload: {
        question: string;
        organizationId: string;
        questionIndex: number;
        totalQuestions: number;
      }) => void;
}

export function useQuestionnaireActions({
  orgId,
  selectedFile,
  results,
  editingAnswer,
  expandedSources,
  setSelectedFile,
  setEditingIndex,
  setEditingAnswer,
  setResults,
  setExpandedSources,
  setIsParseProcessStarted,
  setIsAutoAnswerProcessStarted,
  isAutoAnswerProcessStartedRef,
  setHasClickedAutoAnswer,
  answeringQuestionIndex,
  setAnsweringQuestionIndex,
  setQuestionStatuses,
      uploadFileAction,
      parseAction,
      triggerAutoAnswer,
      triggerSingleAnswer,
    }: UseQuestionnaireActionsProps) {
  const exportAction = useAction(exportQuestionnaire, {
    onSuccess: ({ data }: { data: any }) => {
      const responseData = data?.data || data;
      const filename = responseData?.filename;
      const downloadUrl = responseData?.downloadUrl;

      if (downloadUrl && filename) {
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast.success(`Exported as ${filename}`);
      }
    },
    onError: ({ error }) => {
      console.error('Export action error:', error);
      toast.error(error.serverError || 'Failed to export questionnaire');
    },
  });

  const handleFileSelect = useCallback((acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
    if (rejectedFiles.length > 0) {
      toast.error(`File rejected: ${rejectedFiles[0].errors[0].message}`);
      return;
    }

    if (acceptedFiles.length > 0) {
      setSelectedFile(acceptedFiles[0]);
    }
  }, [setSelectedFile]);

  const handleParse = async () => {
    setIsParseProcessStarted(true);

    if (selectedFile) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const dataUrl = reader.result as string;
        const base64 = dataUrl.split(',')[1];
        const fileType = selectedFile.type || 'application/octet-stream';

        await uploadFileAction.execute({
          fileName: selectedFile.name,
          fileType,
          fileData: base64,
          organizationId: orgId,
        });
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleAutoAnswer = () => {
    // Prevent "Auto Answer All" if a single question is currently being answered
    if (answeringQuestionIndex !== null) {
      toast.warning('Please wait for the current question to finish before answering all questions');
      return;
    }

    setHasClickedAutoAnswer(true);

    if (!results || results.length === 0) {
      toast.error('Please analyze a questionnaire first');
      return;
    }

    // Clear any single question state
    setAnsweringQuestionIndex(null);

    // Optimistic UI update: immediately show spinners for all unanswered questions
    // This makes the UI feel instant and responsive - no delay waiting for task to start
    setQuestionStatuses((prev) => {
      const newStatuses = new Map(prev);
      results.forEach((qa, index) => {
        if (!qa.answer || qa.answer.trim().length === 0) {
          newStatuses.set(index, 'processing');
        } else {
          // Keep existing completed status
          if (!newStatuses.has(index)) {
            newStatuses.set(index, 'completed');
          }
        }
      });
      return newStatuses;
    });

    // Mark process as started immediately for optimistic UI
    isAutoAnswerProcessStartedRef.current = true;
    setIsAutoAnswerProcessStarted(true);

    // Then trigger the actual task
    // Real metadata updates will refine the statuses as tasks actually start/complete
    triggerAutoAnswer({
      vendorId: `org_${orgId}`,
      organizationId: orgId,
      questionsAndAnswers: results,
    });
  };

  const handleAnswerSingleQuestion = (index: number) => {
    if (!results || !results[index]) {
      toast.error('Question not found');
      return;
    }

    // Prevent multiple simultaneous single question answers
    if (answeringQuestionIndex !== null && answeringQuestionIndex !== index) {
      return;
    }

    setAnsweringQuestionIndex(index);

    // Optimistic UI update: immediately show spinner for this question only
    setQuestionStatuses((prev) => {
      const newStatuses = new Map(prev);
      newStatuses.set(index, 'processing');
      return newStatuses;
    });

    // Trigger answer-question task directly (not orchestrator)
    triggerSingleAnswer({
      question: results[index].question,
      organizationId: orgId,
      questionIndex: index,
      totalQuestions: results.length,
    });
  };

  const handleEditAnswer = (index: number) => {
    setEditingIndex(index);
    setEditingAnswer(results![index].answer || '');
  };

  const handleSaveAnswer = (index: number) => {
    if (!results) return;
    const updated = [...results];
    updated[index] = {
      ...updated[index],
      answer: editingAnswer.trim() || null,
      failedToGenerate: false,
    };
    setResults(updated);
    setEditingIndex(null);
    setEditingAnswer('');
    toast.success('Answer updated');
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditingAnswer('');
  };

  const handleExport = async (format: 'xlsx' | 'csv' | 'pdf') => {
    if (!results || results.length === 0) {
      toast.error('No data to export');
      return;
    }

    await exportAction.execute({
      questionsAndAnswers: results,
      format,
    });
  };

  const handleToggleSource = (index: number) => {
    const newExpanded = new Set(expandedSources);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedSources(newExpanded);
  };

  return {
    exportAction,
    handleFileSelect,
    handleParse,
    handleAutoAnswer,
    handleAnswerSingleQuestion,
    handleEditAnswer,
    handleSaveAnswer,
    handleCancelEdit,
    handleExport,
    handleToggleSource,
  };
}

