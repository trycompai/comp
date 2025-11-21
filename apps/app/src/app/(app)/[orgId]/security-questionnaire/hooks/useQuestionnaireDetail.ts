'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { useQuestionnaireActions } from './useQuestionnaireActions';
import { useQuestionnaireAutoAnswer } from './useQuestionnaireAutoAnswer';
import { useQuestionnaireSingleAnswer } from './useQuestionnaireSingleAnswer';
import type { QuestionAnswer } from '../components/types';
import { createTriggerToken } from '../actions/create-trigger-token';
import { updateQuestionnaireAnswer } from '../actions/update-questionnaire-answer';
import { deleteQuestionnaireAnswer } from '../actions/delete-questionnaire-answer';
import { useAction } from 'next-safe-action/hooks';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { usePersistGeneratedAnswers } from './usePersistGeneratedAnswers';

interface QuestionnaireQuestionAnswer {
  id: string;
  question: string;
  answer: string | null;
  status: 'untouched' | 'generated' | 'manual';
  questionIndex: number;
  sources: any;
}

type QuestionnaireResult = QuestionAnswer & {
  originalIndex: number;
  questionAnswerId: string;
  status: 'untouched' | 'generated' | 'manual';
};

interface UseQuestionnaireDetailProps {
  questionnaireId: string;
  organizationId: string;
  initialQuestions: QuestionnaireQuestionAnswer[];
}

export function useQuestionnaireDetail({
  questionnaireId,
  organizationId,
  initialQuestions,
}: UseQuestionnaireDetailProps) {
  const router = useRouter();
  
  // Initialize results from database
  const [results, setResults] = useState<QuestionnaireResult[]>(() =>
    initialQuestions.map((q) => ({
      question: q.question,
      answer: q.answer ?? null, // Preserve null instead of converting to empty string
      originalIndex: q.questionIndex,
      sources: q.sources ? (Array.isArray(q.sources) ? q.sources : []) : [],
      questionAnswerId: q.id,
      status: q.status,
      failedToGenerate: false, // Initialize failedToGenerate
    }))
  );

  // State management (same as useQuestionnaireState)
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingAnswer, setEditingAnswer] = useState<string>('');
  const [expandedSources, setExpandedSources] = useState<Set<number>>(new Set());
  const [questionStatuses, setQuestionStatuses] = useState<Map<number, 'pending' | 'processing' | 'completed'>>(new Map());
  const [answeringQuestionIndex, setAnsweringQuestionIndex] = useState<number | null>(null);
  const [isAutoAnswerProcessStarted, setIsAutoAnswerProcessStarted] = useState(false);
  const [isParseProcessStarted, setIsParseProcessStarted] = useState(false);
  const [hasClickedAutoAnswer, setHasClickedAutoAnswer] = useState(false);
  const [autoAnswerToken, setAutoAnswerToken] = useState<string | null>(null);
  const [singleAnswerToken, setSingleAnswerToken] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const isAutoAnswerProcessStartedRef = useRef(false);
  
  // Refs to capture values for save callback
  const saveIndexRef = useRef<number | null>(null);
  const saveAnswerRef = useRef<string>('');

  // Actions - use callbacks that reference the refs
  const updateAnswerAction = useAction(updateQuestionnaireAnswer, {
    onSuccess: () => {
      // Only handle manual saves (when saveIndexRef is set)
      if (saveIndexRef.current !== null) {
        const index = saveIndexRef.current;
        const answer = saveAnswerRef.current;
        
        // Update local state optimistically
        setResults((prev) =>
          prev.map((r, i) => {
            if (i === index) {
              const trimmedAnswer = answer.trim();
              // If answer is empty, reset failedToGenerate and allow auto-fill
              // If answer has content, mark as manual
              return { 
                ...r, 
                answer: trimmedAnswer || null, 
                status: trimmedAnswer ? ('manual' as const) : ('untouched' as const),
                failedToGenerate: false, // Reset failedToGenerate when user saves (even if empty)
              };
            }
            return r;
          })
        );

        setEditingIndex(null);
        setEditingAnswer('');
        toast.success('Answer saved');
        router.refresh();
        
        // Reset refs
        saveIndexRef.current = null;
        saveAnswerRef.current = '';
      }
    },
    onError: ({ error }) => {
      console.error('Failed to update answer:', error);
      if (saveIndexRef.current !== null) {
        toast.error(`Failed to save answer: ${error instanceof Error ? error.message : 'Unknown error'}`);
        saveIndexRef.current = null;
        saveAnswerRef.current = '';
      }
    },
  });
  const deleteAnswerAction = useAction(deleteQuestionnaireAnswer);
  // Note: We don't use orchestratorAction here - we use triggerAutoAnswer directly from useQuestionnaireAutoAnswer
  // This ensures we get a trackable run via useRealtimeTaskTrigger

  // Create trigger tokens
  useEffect(() => {
    const fetchTokens = async () => {
      const [autoTokenResult, singleTokenResult] = await Promise.all([
        createTriggerToken('vendor-questionnaire-orchestrator'),
        createTriggerToken('answer-question'),
      ]);
      
      if (autoTokenResult.success && autoTokenResult.token) {
        setAutoAnswerToken(autoTokenResult.token);
      }
      if (singleTokenResult.success && singleTokenResult.token) {
        setSingleAnswerToken(singleTokenResult.token);
      }
    };
    
    fetchTokens();
  }, []);

  // Auto-answer hook (same as useQuestionnaireParser)
  const autoAnswer = useQuestionnaireAutoAnswer({
    autoAnswerToken,
    results: results as QuestionAnswer[] | null,
    answeringQuestionIndex,
    isAutoAnswerProcessStarted,
    isAutoAnswerProcessStartedRef,
    setIsAutoAnswerProcessStarted,
    setResults: setResults as Dispatch<SetStateAction<QuestionAnswer[] | null>>,
    setQuestionStatuses,
    setAnsweringQuestionIndex,
    questionnaireId,
  });

  // Wrapper for setResults that handles QuestionnaireResult[] with originalIndex
  const setResultsWrapper = useCallback((updater: React.SetStateAction<QuestionAnswer[] | null>) => {
    setResults((prevResults) => {
      if (!prevResults) {
        const newResults = typeof updater === 'function' ? updater(null) : updater;
        if (!newResults) return prevResults; // Return empty array instead of null
        // Convert QuestionAnswer[] to QuestionnaireResult[]
        return newResults.map((r, index) => ({
          question: r.question,
          answer: r.answer ?? null, // Preserve null instead of converting to empty string
          originalIndex: index,
          sources: r.sources || [],
          questionAnswerId: '',
          status: 'untouched' as const,
          failedToGenerate: r.failedToGenerate ?? false, // Preserve failedToGenerate
        }));
      }

      const questionAnswerResults = prevResults.map((r) => ({
        question: r.question,
        answer: r.answer,
        sources: r.sources,
        failedToGenerate: (r as any).failedToGenerate ?? false, // Preserve failedToGenerate from result
        _originalIndex: r.originalIndex, // Preserve originalIndex
      }));

      const newResults = typeof updater === 'function' 
        ? updater(questionAnswerResults)
        : updater;

      if (!newResults) return prevResults; // Return previous results instead of null

      // Map back to QuestionnaireResult[] preserving originalIndex
      return newResults.map((newR, index) => {
        const originalIndex = (newR as any)._originalIndex !== undefined 
          ? (newR as any)._originalIndex 
          : index;
        const existingResult = prevResults.find((r) => r.originalIndex === originalIndex);
        if (existingResult) {
          return {
            ...existingResult,
            question: newR.question,
            answer: newR.answer ?? null, // Preserve null instead of converting to empty string
            sources: newR.sources,
            failedToGenerate: newR.failedToGenerate ?? false, // Preserve failedToGenerate
          };
        }
        // Fallback: create new result (shouldn't happen)
        return {
          question: newR.question,
          answer: newR.answer ?? null, // Preserve null instead of converting to empty string
          originalIndex,
          sources: newR.sources || [],
          questionAnswerId: '',
          status: 'untouched' as const,
          failedToGenerate: newR.failedToGenerate ?? false, // Preserve failedToGenerate
        };
      });
    });
  }, []);

  // Single answer hook (same as useQuestionnaireParser)
  const singleAnswer = useQuestionnaireSingleAnswer({
    singleAnswerToken,
    results: results.map((r) => ({
      question: r.question,
      answer: r.answer,
      sources: r.sources,
      failedToGenerate: (r as any).failedToGenerate ?? false, // Preserve failedToGenerate from result
      _originalIndex: r.originalIndex, // Pass originalIndex for reference
    })) as QuestionAnswer[],
    answeringQuestionIndex,
    setResults: setResultsWrapper,
    setQuestionStatuses,
    setAnsweringQuestionIndex,
    questionnaireId,
  });

  // Expose isSingleAnswerTriggering for isLoading calculation
  const isSingleAnswerTriggering = singleAnswer.isSingleAnswerTriggering;

  // Reuse the same actions hook (but adapt it for detail page)
  const actions = useQuestionnaireActions({
    orgId: organizationId,
    selectedFile: null,
    results: results as QuestionAnswer[] | null,
    editingAnswer,
    expandedSources,
    setSelectedFile: () => {},
    setEditingIndex,
    setEditingAnswer,
    setResults: setResults as Dispatch<SetStateAction<QuestionAnswer[] | null>>,
    setExpandedSources,
    isParseProcessStarted,
    setIsParseProcessStarted,
    setIsAutoAnswerProcessStarted,
    isAutoAnswerProcessStartedRef,
    setHasClickedAutoAnswer,
    answeringQuestionIndex,
    setAnsweringQuestionIndex,
    setQuestionStatuses,
    questionnaireId,
    setParseTaskId: () => {},
    setParseToken: () => {},
    uploadFileAction: { execute: async () => {}, status: 'idle' as const },
    parseAction: { execute: async () => {}, status: 'idle' as const },
    triggerAutoAnswer: autoAnswer.triggerAutoAnswer,
    triggerSingleAnswer: singleAnswer.triggerSingleAnswer,
  });

  const persistenceAction = {
    execute: () => {},
    executeAsync: (input: Parameters<typeof updateAnswerAction.executeAsync>[0]) =>
      updateAnswerAction.executeAsync(input),
  };

  usePersistGeneratedAnswers({
    questionnaireId,
    results: results as QuestionAnswer[] | null,
    setResults: setResults as Dispatch<SetStateAction<QuestionAnswer[] | null>>,
    autoAnswerRun: autoAnswer.autoAnswerRun ?? null,
    updateAnswerAction: persistenceAction as any,
    setQuestionStatuses,
  });

  // Override handleAutoAnswer to include orchestrator call
  const handleAutoAnswer = () => {
    if (answeringQuestionIndex !== null) {
      toast.warning('Please wait for the current question to finish before answering all questions');
      return;
    }

    setHasClickedAutoAnswer(true);
    setIsAutoAnswerProcessStarted(true);
    isAutoAnswerProcessStartedRef.current = true;

    // Filter out questions with manual answers
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

    // Optimistic UI update: immediately show spinners for all unanswered questions
    setQuestionStatuses((prev) => {
      const newStatuses = new Map(prev);
      questionsToAnswer.forEach((q) => {
        if (q._originalIndex !== undefined) {
          newStatuses.set(q._originalIndex, 'processing');
        }
      });
      return newStatuses;
    });

    // Call triggerAutoAnswer directly - this will trigger the task AND give us a trackable run
    // The useRealtimeTaskTrigger hook will handle the actual task triggering
    try {
      autoAnswer.triggerAutoAnswer({
        vendorId: `org_${organizationId}`,
        organizationId,
        questionsAndAnswers: questionsToAnswer.map((q) => ({
          question: q.question,
          answer: q.answer,
          _originalIndex: q._originalIndex, // Pass _originalIndex for orchestrator to use
        })) as any,
      });
      console.log('Triggered auto-answer, run should be available soon');
    } catch (error) {
      console.error('Failed to trigger auto-answer:', error);
      toast.error('Failed to start auto-answer process');
      setIsAutoAnswerProcessStarted(false);
      isAutoAnswerProcessStartedRef.current = false;
      // Reset question statuses
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

  // Override handleAnswerSingleQuestion to set processing status immediately
  const handleAnswerSingleQuestion = (index: number) => {
    if (isAutoAnswerProcessStarted || answeringQuestionIndex !== null) {
      return;
    }

    const result = results.find((r) => r.originalIndex === index);
    if (!result) {
      return;
    }
    
    // Allow auto-fill even if status is 'manual' - user may have cleared the answer
    // Only prevent if there's already an answer (non-empty)
    if (result.status === 'manual' && result.answer && result.answer.trim().length > 0) {
      return;
    }

    setAnsweringQuestionIndex(index);
    
    // Set status to processing immediately to show spinner
    setQuestionStatuses((prev) => {
      const newStatuses = new Map(prev);
      newStatuses.set(index, 'processing');
      return newStatuses;
    });

    singleAnswer.triggerSingleAnswer({
      question: result.question,
      organizationId,
      questionIndex: index,
      totalQuestions: results.length,
    });
  };

  // Handle delete manual answer
  const handleDeleteAnswer = async (questionAnswerId: string, questionIndex: number) => {
    try {
      await deleteAnswerAction.execute({
        questionnaireId,
        questionAnswerId,
      });

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

  // Handle save answer (override to save to database)
  const handleSaveAnswer = (index: number) => {
    // The index passed is the array index from QuestionnaireResultsTable
    // Find the result at that array position
    const result = results[index];
    
    if (!result) {
      console.error('Cannot save answer: result not found at index', { 
        index, 
        resultsLength: results.length,
        results: results.map((r, i) => ({ i, originalIndex: r.originalIndex, questionAnswerId: r.questionAnswerId }))
      });
      toast.error('Cannot find question to save');
      return;
    }
    
    if (!result.questionAnswerId) {
      console.error('Cannot save answer: questionAnswerId not found', { index, result });
      toast.error('Cannot save answer: missing question ID');
      return;
    }

    // Store values in refs for the callback
    saveIndexRef.current = index;
    saveAnswerRef.current = editingAnswer;

    // Execute the save - callbacks will use the refs
    updateAnswerAction.execute({
      questionnaireId,
      questionAnswerId: result.questionAnswerId,
      answer: editingAnswer.trim(),
    });
  };

  const filteredResults = useMemo(() => {
    if (!searchQuery.trim()) return results;
    const query = searchQuery.toLowerCase();
    return results.filter(
      (r) =>
        r.question.toLowerCase().includes(query) ||
        (r.answer && r.answer.toLowerCase().includes(query))
    );
  }, [results, searchQuery]);

  const answeredCount = useMemo(() => {
    return results.filter((r) => r.answer && r.answer.trim().length > 0).length;
  }, [results]);

  const progressPercentage = useMemo(() => {
    if (results.length === 0) return 0;
    return Math.round((answeredCount / results.length) * 100);
  }, [answeredCount, results.length]);

  const isAutoAnswering = useMemo(() => {
    return (
      isAutoAnswerProcessStarted &&
      hasClickedAutoAnswer &&
      (autoAnswer.autoAnswerRun?.status === 'EXECUTING' ||
        autoAnswer.autoAnswerRun?.status === 'QUEUED' ||
        autoAnswer.autoAnswerRun?.status === 'WAITING')
    );
  }, [isAutoAnswerProcessStarted, hasClickedAutoAnswer, autoAnswer.autoAnswerRun?.status]);

  // Calculate isLoading based on answer generation status
  const isLoading = useMemo(() => {
    // Check if any question is being processed
    const hasProcessingQuestions = Array.from(questionStatuses.values()).some(
      (status) => status === 'processing'
    );
    
    // Check if single answer is being triggered
    const isSingleAnswerTriggering = singleAnswer.isSingleAnswerTriggering;
    
    // Check if auto answer is being triggered or running
    const isAutoAnswerTriggering = autoAnswer.isAutoAnswerTriggering;
    const isAutoAnswerRunActive =
      autoAnswer.autoAnswerRun?.status === 'EXECUTING' ||
      autoAnswer.autoAnswerRun?.status === 'QUEUED' ||
      autoAnswer.autoAnswerRun?.status === 'WAITING';

    return hasProcessingQuestions || isSingleAnswerTriggering || isAutoAnswerTriggering || isAutoAnswerRunActive;
  }, [
    questionStatuses,
    isSingleAnswerTriggering,
    autoAnswer.isAutoAnswerTriggering,
    autoAnswer.autoAnswerRun?.status,
  ]);

  // Check if saving is in progress
  const isSaving = updateAnswerAction.status === 'executing';
  const savingIndex = isSaving && saveIndexRef.current !== null ? saveIndexRef.current : null;

  return {
    orgId: organizationId,
    results,
    searchQuery,
    setSearchQuery,
    editingIndex,
    editingAnswer,
    setEditingAnswer,
    expandedSources,
    questionStatuses,
    answeringQuestionIndex,
    hasClickedAutoAnswer,
    isLoading,
    isAutoAnswering,
    isExporting: actions.exportAction.status === 'executing',
    isSaving,
    savingIndex,
    filteredResults,
    answeredCount,
    totalCount: results.length,
    progressPercentage,
    handleAutoAnswer,
    handleAnswerSingleQuestion,
    handleEditAnswer: actions.handleEditAnswer,
    handleSaveAnswer,
    handleCancelEdit: actions.handleCancelEdit,
    handleExport: actions.handleExport,
    handleToggleSource: actions.handleToggleSource,
  };
}

