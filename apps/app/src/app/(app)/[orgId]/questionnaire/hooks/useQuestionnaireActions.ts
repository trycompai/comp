'use client';

import { useAction } from 'next-safe-action/hooks';
import { useCallback, useEffect, useRef, useTransition } from 'react';
import type { FileRejection } from 'react-dropzone';
import { toast } from 'sonner';
import { exportQuestionnaire } from '../actions/export-questionnaire';
import { saveAnswerAction } from '../actions/save-answer';
import type { QuestionAnswer } from '../components/types';

interface UseQuestionnaireActionsProps {
  orgId: string;
  selectedFile: File | null;
  results: QuestionAnswer[] | null;
  editingAnswer: string;
  expandedSources: Set<number>;
  questionnaireId: string | null;
  setSelectedFile: (file: File | null) => void;
  setEditingIndex: (index: number | null) => void;
  setEditingAnswer: (answer: string) => void;
  setResults: React.Dispatch<React.SetStateAction<QuestionAnswer[] | null>>;
  setExpandedSources: React.Dispatch<React.SetStateAction<Set<number>>>;
  isParseProcessStarted: boolean;
  setIsParseProcessStarted: (started: boolean) => void;
  setIsAutoAnswerProcessStarted: (started: boolean) => void;
  isAutoAnswerProcessStartedRef: React.MutableRefObject<boolean>;
  setHasClickedAutoAnswer: (clicked: boolean) => void;
  answeringQuestionIndex: number | null;
  setAnsweringQuestionIndex: (index: number | null) => void;
  setQuestionStatuses: React.Dispatch<
    React.SetStateAction<Map<number, 'pending' | 'processing' | 'completed'>>
  >;
  setParseTaskId: (id: string | null) => void;
  setParseToken: (token: string | null) => void;
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
  questionnaireId,
  setSelectedFile,
  setEditingIndex,
  setEditingAnswer,
  setResults,
  setExpandedSources,
  isParseProcessStarted,
  setIsParseProcessStarted,
  setIsAutoAnswerProcessStarted,
  isAutoAnswerProcessStartedRef,
  setHasClickedAutoAnswer,
  answeringQuestionIndex,
  setAnsweringQuestionIndex,
  setQuestionStatuses,
  setParseTaskId,
  setParseToken,
  uploadFileAction,
  parseAction,
  triggerAutoAnswer,
  triggerSingleAnswer,
}: UseQuestionnaireActionsProps) {
  const saveAnswer = useAction(saveAnswerAction, {
    onSuccess: () => {
      // Answer saved successfully
    },
    onError: ({ error }) => {
      console.error('Error saving answer:', error);
      // Don't show toast for every save - too noisy
    },
  });

  const [isPending, startTransition] = useTransition();

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

  // ✅ Double-click protection using useRef
  const isParsingRef = useRef(false);

  const handleParse = async () => {
    // ✅ DOUBLE-CLICK PROTECTION
    if (isParsingRef.current) {
      toast.warning('Analysis is already in progress. Please wait...');
      return;
    }

    // ✅ Check if parsing is already in progress via state
    if (isParseProcessStarted) {
      toast.warning('Please wait for the current analysis to complete');
      return;
    }

    // Set parsing flag
    isParsingRef.current = true;

    try {
      // Clear old parse state before starting new parse to prevent token mismatch
      setParseTaskId(null);
      setParseToken(null);
      setIsParseProcessStarted(true);

      if (selectedFile) {
        const reader = new FileReader();
        reader.onloadend = async () => {
          try {
            const dataUrl = reader.result as string;
            const base64 = dataUrl.split(',')[1];
            const fileType = selectedFile.type || 'application/octet-stream';

            await uploadFileAction.execute({
              fileName: selectedFile.name,
              fileType,
              fileData: base64,
              organizationId: orgId,
            });
          } catch (error) {
            // Reset flag on error
            isParsingRef.current = false;
            setIsParseProcessStarted(false);
            console.error('Error uploading file:', error);
            toast.error('Failed to upload file. Please try again.');
          }
        };
        reader.onerror = () => {
          isParsingRef.current = false;
          setIsParseProcessStarted(false);
          toast.error('Failed to read file. Please try again.');
        };
        reader.readAsDataURL(selectedFile);
      } else {
        // If file is not selected, reset flag
        isParsingRef.current = false;
        setIsParseProcessStarted(false);
      }
    } catch (error) {
      isParsingRef.current = false;
      setIsParseProcessStarted(false);
      console.error('Error in handleParse:', error);
      toast.error('Failed to start analysis. Please try again.');
    }
  };

  // ✅ Reset flag when parsing is completed
  useEffect(() => {
    if (!isParseProcessStarted) {
      isParsingRef.current = false;
    }
  }, [isParseProcessStarted]);

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
    if (!results || !questionnaireId) return;
    const updated = [...results];
    const answerText = editingAnswer.trim() || null;
    updated[index] = {
      ...updated[index],
      answer: answerText,
      failedToGenerate: false,
    };
    setResults(updated);
    setEditingIndex(null);
    setEditingAnswer('');

    // Save to database (use startTransition to avoid rendering issues)
    startTransition(() => {
      saveAnswer.execute({
        questionnaireId,
        questionIndex: index,
        answer: answerText,
        status: 'manual',
      });
    });

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

