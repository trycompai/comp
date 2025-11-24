'use client';

import { useRealtimeTaskTrigger } from '@trigger.dev/react-hooks';
import type { vendorQuestionnaireOrchestratorTask } from '@/jobs/tasks/vendors/vendor-questionnaire-orchestrator';
import { useEffect, useMemo, useRef, useTransition } from 'react';
import { toast } from 'sonner';
import { useAction } from 'next-safe-action/hooks';
import { saveAnswerAction } from '../actions/save-answer';
import { saveAnswersBatchAction } from '../actions/save-answers-batch';
import type { QuestionAnswer } from '../components/types';

interface UseQuestionnaireAutoAnswerProps {
  autoAnswerToken: string | null;
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
  autoAnswerToken,
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
  // Use realtime task trigger for auto-answer
  const {
    submit: triggerAutoAnswer,
    run: autoAnswerRun,
    error: autoAnswerError,
    isLoading: isAutoAnswerTriggering,
  } = useRealtimeTaskTrigger<typeof vendorQuestionnaireOrchestratorTask>('vendor-questionnaire-orchestrator', {
    accessToken: autoAnswerToken || undefined,
    enabled: !!autoAnswerToken,
  });

  // Action for saving answers batch
  const saveAnswersBatch = useAction(saveAnswersBatchAction, {
    onError: ({ error }) => {
      console.error('Error saving answers batch:', error);
    },
  });

  const [isPending, startTransition] = useTransition();


  // Track which run ID we're currently processing for single questions
  const currentRunIdRef = useRef<string | null>(null);
  // Track which run IDs we've already processed completion for (to prevent infinite loops)
  const processedCompletionRef = useRef<Set<string>>(new Set());
  // Use ref to access latest results without causing dependency issues
  const resultsRef = useRef(results);
  useEffect(() => {
    resultsRef.current = results;
  }, [results]);

  // Track run ID when a new single question operation starts
  useEffect(() => {
    if (answeringQuestionIndex !== null && autoAnswerRun?.id) {
      currentRunIdRef.current = autoAnswerRun.id;
    } else if (answeringQuestionIndex === null) {
      currentRunIdRef.current = null; // Clear when no single question is active
    }
  }, [answeringQuestionIndex, autoAnswerRun?.id]);

  // Extract answers and statuses from metadata using useMemo (like OnboardingTracker)
  // This ensures React re-renders whenever metadata changes
  const metadataAnswers = useMemo(() => {
    if (!autoAnswerRun?.metadata || !resultsRef.current) {
      return { 
        answers: [], 
        statuses: new Map<number, 'pending' | 'processing' | 'completed'>()
      };
    }

    // For single question operations, only process metadata from the current run
    if (answeringQuestionIndex !== null) {
      if (currentRunIdRef.current && autoAnswerRun.id !== currentRunIdRef.current) {
        return { 
          answers: [], 
          statuses: new Map<number, 'pending' | 'processing' | 'completed'>(), 
          sources: new Map<number, any[]>() 
        };
      }
    }

    const meta = autoAnswerRun.metadata as Record<string, unknown>;
    
    // Get all answer keys and status keys from metadata
    // Exclude _sources keys - they are handled separately
    const answerKeys = Object.keys(meta).filter((key) => 
      key.startsWith('answer_') && !key.endsWith('_sources')
    ).sort();
    const statusKeys = Object.keys(meta).filter((key) => key.startsWith('question_') && key.endsWith('_status')).sort();
    
    // Extract all answers from metadata
    const answers = answerKeys
      .map((key) => {
        const rawValue = meta[key];
        
        if (!rawValue || typeof rawValue !== 'object') {
          return undefined;
        }

        const answerData = rawValue as {
          questionIndex?: number;
          question?: string;
          answer?: string | null;
          sources?: Array<{
            sourceType: string;
            sourceName?: string;
            score: number;
          }>;
        };

        if (typeof answerData.questionIndex !== 'number') {
          return undefined;
        }

        return {
          metadataKey: key,
          questionIndex: answerData.questionIndex,
          question: answerData.question || '',
          answer: answerData.answer ?? null,
          sources: answerData.sources || [],
        };
      })
      .filter((answer): answer is NonNullable<typeof answer> => answer !== undefined)
      .sort((a, b) => a.questionIndex - b.questionIndex);

    // Extract statuses
    const statusMap = new Map<number, 'pending' | 'processing' | 'completed'>();
    statusKeys.forEach((key) => {
      const match = key.match(/^question_(\d+)_status$/);
      if (match) {
        const questionIndex = parseInt(match[1], 10);
        
        // If this is a single question operation, only process status for that question
        if (answeringQuestionIndex !== null) {
          if (questionIndex !== answeringQuestionIndex) {
            return;
          }
        }
        
        const status = meta[key] as 'pending' | 'processing' | 'completed' | undefined;
        if (status) {
          statusMap.set(questionIndex, status);
        }
      }
    });
    
    return { answers, statuses: statusMap };
  }, [autoAnswerRun?.metadata, autoAnswerRun?.id, answeringQuestionIndex]);

  // Apply metadata updates to state whenever metadataAnswers changes
  // This pattern matches OnboardingTracker - React automatically re-renders when metadata changes
  useEffect(() => {
    if (!resultsRef.current) {
      // Still update statuses even if no results
      if (metadataAnswers.statuses.size > 0) {
        setQuestionStatuses((prev) => {
          const newStatuses = new Map(prev);
          let hasChanges = false;
          metadataAnswers.statuses.forEach((status, questionIndex) => {
            if (prev.get(questionIndex) !== status) {
              newStatuses.set(questionIndex, status);
              hasChanges = true;
            }
          });
          return hasChanges ? newStatuses : prev;
        });
      }
      return;
    }

    const isSingleQuestion = answeringQuestionIndex !== null;

    // Update statuses first
    if (metadataAnswers.statuses.size > 0) {
      setQuestionStatuses((prev) => {
        const newStatuses = new Map(prev);
        let hasChanges = false;
        metadataAnswers.statuses.forEach((status, questionIndex) => {
          if (prev.get(questionIndex) !== status) {
            newStatuses.set(questionIndex, status);
            hasChanges = true;
          }
        });
        return hasChanges ? newStatuses : prev;
      });
    }
    
    // Update answers - process each answer individually
        setResults((prevResults) => {
          if (!prevResults) {
            return prevResults;
          }

          const updatedResults = [...prevResults];
          let hasChanges = false;
      let updatedCount = 0;
      let skippedCount = 0;

      metadataAnswers.answers.forEach((answer) => {
            // For single question operations, only process answers for that specific question
            if (isSingleQuestion && answeringQuestionIndex !== null) {
              if (answer.questionIndex !== answeringQuestionIndex) {
            return;
              }
            }
            
            const targetIndex = answer.questionIndex;
            
        // Safety check
            if (targetIndex < 0 || targetIndex >= updatedResults.length) {
              return;
            }

            const currentAnswer = updatedResults[targetIndex]?.answer;
            const originalQuestion = updatedResults[targetIndex]?.question;
            
        // Skip only if we already have the exact same answer (both non-null and equal)
        // Always update if: answer changed, or going from null to answer, or answer to null
        if (currentAnswer !== null && currentAnswer === answer.answer) {
          // Already has this exact non-null answer, skip to avoid unnecessary updates
          return;
        }
            
            if (answer.answer) {
          // Update successful answer immediately - show it as soon as it's available
          // Sources will be updated separately from answer_${questionIndex}_sources metadata key
          // Preserve existing sources - don't overwrite them with empty array
          const existingSources = updatedResults[targetIndex]?.sources || [];
          
                updatedResults[targetIndex] = {
            ...updatedResults[targetIndex],
            question: originalQuestion || answer.question,
                  answer: answer.answer,
                  sources: existingSources, // Keep existing sources, they'll be updated separately
                  failedToGenerate: false,
                };
                hasChanges = true;
              } else {
          // Update failed answer only if no answer exists yet
              if (!currentAnswer) {
                updatedResults[targetIndex] = {
                  ...updatedResults[targetIndex],
              question: originalQuestion || answer.question,
                  answer: null,
                  failedToGenerate: true,
                };
                hasChanges = true;
              }
            }
          });

          return hasChanges ? updatedResults : prevResults;
        });
  }, [metadataAnswers, answeringQuestionIndex]);

  // Update sources from final output when available
  // This ensures sources are updated even if they weren't in metadata
  useEffect(() => {
    if (
      autoAnswerRun?.status === 'COMPLETED' &&
      autoAnswerRun.output &&
      autoAnswerRun.output.answers
    ) {
      const answers = autoAnswerRun.output.answers as
        | Array<{
            questionIndex: number;
            sources?: Array<{
              sourceType: string;
              sourceName?: string;
              score: number;
            }>;
          }>
        | undefined;

      if (answers && Array.isArray(answers)) {
        setResults((prevResults) => {
          if (!prevResults) return prevResults;

          const updatedResults = [...prevResults];
          let hasChanges = false;

          answers.forEach((answer) => {
            if (answer.sources && answer.sources.length > 0) {
              const directIndex =
                answer.questionIndex >= 0 && answer.questionIndex < updatedResults.length
                  ? answer.questionIndex
                  : -1;

              const fallbackIndex =
                directIndex === -1
                  ? updatedResults.findIndex((r, idx) => {
                      const candidate =
                        (r as { originalIndex?: number; _originalIndex?: number }).originalIndex ??
                        (r as { originalIndex?: number; _originalIndex?: number })._originalIndex ??
                        idx;
                      return candidate === answer.questionIndex;
                    })
                  : directIndex;

              if (fallbackIndex >= 0 && fallbackIndex < updatedResults.length) {
                const currentSources = updatedResults[fallbackIndex]?.sources || [];
                const sourcesChanged =
                  JSON.stringify(currentSources) !== JSON.stringify(answer.sources);

                if (sourcesChanged) {
                  updatedResults[fallbackIndex] = {
                    ...updatedResults[fallbackIndex],
                    sources: answer.sources,
                  };
                  hasChanges = true;
                }
              }
            }
          });

          return hasChanges ? updatedResults : prevResults;
        });
      }
    }
  }, [autoAnswerRun?.status, autoAnswerRun?.output, setResults]);

  // Handle final completion - read ALL answers from final output
  // This is a fallback to ensure all answers are shown even if metadata updates were missed
  // Primary source is incremental metadata updates above, which show answers as they complete
  useEffect(() => {
    if (
      autoAnswerRun?.status === 'COMPLETED' &&
      autoAnswerRun.output &&
      autoAnswerRun.id &&
      !processedCompletionRef.current.has(autoAnswerRun.id)
    ) {
      const answers = autoAnswerRun.output.answers as
        | Array<{
            questionIndex: number;
            question: string;
            answer: string | null;
            sources?: Array<{
              sourceType: string;
              sourceName?: string;
              score: number;
            }>;
          }>
        | undefined;

      if (answers && Array.isArray(answers)) {
        // Mark this run as processed to prevent infinite loops
        processedCompletionRef.current.add(autoAnswerRun.id);

        // Update results from final output - merge new answers with existing ones
        // The orchestrator only returns answers for questions it processed (unanswered ones)
        // So we merge them with existing answers
        setResults((prevResults) => {
          if (!prevResults) return prevResults;

          const updatedResults = [...prevResults];
          let hasChanges = false;

          // Create a map of new answers by questionIndex for quick lookup
          const newAnswersMap = new Map(
            answers.map((answer) => [answer.questionIndex, answer])
          );

          // Update only the questions that were processed (have new answers)
          newAnswersMap.forEach((answer, targetIndex) => {
            // Safety check: ensure targetIndex is valid
            if (targetIndex < 0 || targetIndex >= updatedResults.length) {
              return;
            }

            const originalQuestion = updatedResults[targetIndex]?.question;
            const currentAnswer = updatedResults[targetIndex]?.answer;
            const currentSources = updatedResults[targetIndex]?.sources || [];

            // Update with new answer from orchestrator
            if (answer.answer) {
              // Always update sources from final output if they exist, even if answer is the same
              // This ensures sources are available even if they weren't in metadata
              const sourcesToUse = answer.sources && answer.sources.length > 0 
                ? answer.sources 
                : currentSources;
              
              // Update if answer changed or sources changed
              const answerChanged = currentAnswer !== answer.answer;
              const sourcesChanged = JSON.stringify(currentSources) !== JSON.stringify(sourcesToUse);
              
              if (answerChanged || sourcesChanged) {
                updatedResults[targetIndex] = {
                  ...updatedResults[targetIndex], // Preserve status and other fields
                  question: originalQuestion || answer.question,
                  answer: answer.answer,
                  sources: sourcesToUse,
                  failedToGenerate: false,
                };
                hasChanges = true;
              }
            } else {
              // Mark as failed if no answer was generated (only if it wasn't already answered)
              if (!currentAnswer) {
                updatedResults[targetIndex] = {
                  ...updatedResults[targetIndex],
                  question: originalQuestion || answer.question,
                  answer: null,
                  failedToGenerate: true,
                };
                hasChanges = true;
              }
            }
          });

          return hasChanges ? updatedResults : prevResults;
        });

        // Save all answers in batch after final output (defer to avoid rendering issues)
        if (questionnaireId) {
          const answersToSave = answers
            .map((answer) => {
              if (answer.answer) {
                return {
                  questionIndex: answer.questionIndex,
                  answer: answer.answer,
                  sources: answer.sources,
                  status: 'generated' as const,
                };
              }
              return null;
            })
            .filter((a): a is NonNullable<typeof a> => a !== null);

          if (answersToSave.length > 0) {
            // Use startTransition to defer the save call to avoid rendering issues
            startTransition(() => {
              saveAnswersBatch.execute({
                questionnaireId,
                answers: answersToSave,
              });
            });
          }
        }

        const isSingleQuestion = answeringQuestionIndex !== null;

        // Mark all remaining "processing" questions as "completed" when orchestrator finishes
        setQuestionStatuses((prev) => {
          const newStatuses = new Map(prev);
          if (isSingleQuestion && answeringQuestionIndex !== null) {
            // Single question: only mark that question as completed
            const currentStatus = prev.get(answeringQuestionIndex);
            if (currentStatus === 'processing') {
              newStatuses.set(answeringQuestionIndex, 'completed');
            }
          } else {
            // Batch operation: mark all processing questions as completed
            answers.forEach((answer) => {
              const currentStatus = prev.get(answer.questionIndex);
              if (currentStatus === 'processing') {
                newStatuses.set(answer.questionIndex, 'completed');
              }
            });
          }
          return newStatuses;
        });

        // Cleanup: mark process as finished
        if (!isSingleQuestion) {
          isAutoAnswerProcessStartedRef.current = false;
          setIsAutoAnswerProcessStarted(false);
        }

        // Reset answering index and run ID for single questions
        if (isSingleQuestion) {
          setAnsweringQuestionIndex(null);
          currentRunIdRef.current = null;
        }

        // Show final toast notification
        const totalQuestions = answers.length;
        const answeredQuestions = answers.filter((a) => a.answer).length;
        const noAnswerQuestions = totalQuestions - answeredQuestions;

        if (isSingleQuestion) {
          if (answeredQuestions > 0) {
            toast.success('Answer generated successfully');
          } else {
            toast.warning('Could not find relevant information in your policies for this question.');
          }
        } else {
          if (answeredQuestions > 0) {
            toast.success(
              `Answered ${answeredQuestions} of ${totalQuestions} question${totalQuestions > 1 ? 's' : ''}${noAnswerQuestions > 0 ? `. ${noAnswerQuestions} had insufficient information.` : '.'}`,
            );
          } else {
            toast.warning(
              `Could not find relevant information in your policies. Try adding more detail about ${answers[0]?.question.split(' ').slice(0, 5).join(' ')}...`,
            );
          }
        }
      }
    }
  }, [
    autoAnswerRun?.status,
    autoAnswerRun?.output,
    autoAnswerRun?.id,
    answeringQuestionIndex,
    questionnaireId,
    saveAnswersBatch,
    setAnsweringQuestionIndex,
    setQuestionStatuses,
    setIsAutoAnswerProcessStarted,
    isAutoAnswerProcessStartedRef,
  ]);

  // Handle auto-answer errors
  useEffect(() => {
    if (autoAnswerError) {
      isAutoAnswerProcessStartedRef.current = false;
      setIsAutoAnswerProcessStarted(false);
      toast.error(`Failed to generate answer: ${autoAnswerError.message}`);
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
      currentRunIdRef.current = null; // Clear run ID on error
    }
  }, [
    autoAnswerError,
    setIsAutoAnswerProcessStarted,
    isAutoAnswerProcessStartedRef,
    setQuestionStatuses,
    setAnsweringQuestionIndex,
  ]);

  // Handle auto-answer task status changes
  // Only set global process started for batch operations (when answeringQuestionIndex is null)
  useEffect(() => {
    const isBatchOp = answeringQuestionIndex === null;
    
    // For single question operations, track the run ID
    if (!isBatchOp && autoAnswerRun?.id && answeringQuestionIndex !== null) {
      currentRunIdRef.current = autoAnswerRun.id;
    }
    
    if (
      (autoAnswerRun?.status === 'EXECUTING' || autoAnswerRun?.status === 'QUEUED') &&
      !isAutoAnswerProcessStarted &&
      isBatchOp
    ) {
      isAutoAnswerProcessStartedRef.current = true;
      setIsAutoAnswerProcessStarted(true);
    }
  }, [autoAnswerRun?.status, autoAnswerRun?.id, isAutoAnswerProcessStarted, setIsAutoAnswerProcessStarted, isAutoAnswerProcessStartedRef, answeringQuestionIndex]);

  // Handle task failures and cancellations
  useEffect(() => {
    if (autoAnswerRun?.status === 'FAILED' || autoAnswerRun?.status === 'CANCELED') {
      isAutoAnswerProcessStartedRef.current = false;
      setIsAutoAnswerProcessStarted(false);
      const errorMessage =
        autoAnswerRun.error instanceof Error
          ? autoAnswerRun.error.message
          : typeof autoAnswerRun.error === 'string'
            ? autoAnswerRun.error
            : 'Task failed or was canceled';
      toast.error(`Failed to generate answer: ${errorMessage}`);

      // Mark all processing questions as completed on failure
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
      currentRunIdRef.current = null; // Clear run ID on failure/cancellation
    }
  }, [
    autoAnswerRun?.status,
    autoAnswerRun?.error,
    setQuestionStatuses,
    setIsAutoAnswerProcessStarted,
    isAutoAnswerProcessStartedRef,
    setAnsweringQuestionIndex,
  ]);

  // Check if this is a batch operation (all questions) vs single question
  const isBatchOperation = useMemo(() => {
    // If answeringQuestionIndex is null, it's a batch operation
    // If answeringQuestionIndex is set, it's a single question operation
    return answeringQuestionIndex === null;
  }, [answeringQuestionIndex]);

  const isAutoAnswering = useMemo(() => {
    // Only consider it "auto answering" if it's a batch operation
    // Single question operations are tracked separately via answeringQuestionIndex
    if (!isBatchOperation) {
      return false;
    }

    const processStarted = isAutoAnswerProcessStartedRef.current || isAutoAnswerProcessStarted;

    if (processStarted) {
      if (
        autoAnswerRun?.status === 'COMPLETED' ||
        autoAnswerRun?.status === 'FAILED' ||
        autoAnswerRun?.status === 'CANCELED'
      ) {
        return false;
      }
      return true;
    }

    const isRunActive =
      autoAnswerRun?.status === 'EXECUTING' ||
      autoAnswerRun?.status === 'QUEUED' ||
      autoAnswerRun?.status === 'WAITING';

    if (isRunActive) {
      return true;
    }

    if (isAutoAnswerTriggering) {
      return true;
    }

    if (
      autoAnswerRun?.status === 'COMPLETED' ||
      autoAnswerRun?.status === 'FAILED' ||
      autoAnswerRun?.status === 'CANCELED'
    ) {
      return false;
    }

    return false;
  }, [isAutoAnswerTriggering, autoAnswerRun?.status, isAutoAnswerProcessStarted, autoAnswerRun, isAutoAnswerProcessStartedRef, isBatchOperation]);

  return {
    triggerAutoAnswer,
    autoAnswerRun,
    autoAnswerError,
    isAutoAnswerTriggering,
    isAutoAnswering,
  };
}

