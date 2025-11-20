"use client";

import type { vendorQuestionnaireOrchestratorTask } from "@/jobs/tasks/vendors/vendor-questionnaire-orchestrator";
import { useEffect, useMemo, useRef } from "react";
import { useRealtimeTaskTrigger } from "@trigger.dev/react-hooks";
import { toast } from "sonner";

import type { QuestionAnswer } from "../components/types";

interface UseQuestionnaireAutoAnswerProps {
  autoAnswerToken: string | null;
  results: QuestionAnswer[] | null;
  answeringQuestionIndex: number | null;
  isAutoAnswerProcessStarted: boolean;
  isAutoAnswerProcessStartedRef: React.MutableRefObject<boolean>;
  setIsAutoAnswerProcessStarted: (started: boolean) => void;
  setResults: React.Dispatch<React.SetStateAction<QuestionAnswer[] | null>>;
  setQuestionStatuses: React.Dispatch<
    React.SetStateAction<Map<number, "pending" | "processing" | "completed">>
  >;
  setAnsweringQuestionIndex: (index: number | null) => void;
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
}: UseQuestionnaireAutoAnswerProps) {
  // Use realtime task trigger for auto-answer
  const {
    submit: triggerAutoAnswer,
    run: autoAnswerRun,
    error: autoAnswerError,
    isLoading: isAutoAnswerTriggering,
  } = useRealtimeTaskTrigger<typeof vendorQuestionnaireOrchestratorTask>(
    "vendor-questionnaire-orchestrator",
    {
      accessToken: autoAnswerToken || undefined,
      enabled: !!autoAnswerToken,
    },
  );

  // Track processed metadata to avoid infinite loops
  const processedMetadataRef = useRef<string>("");
  // Track which run ID we're currently processing for single questions
  const currentRunIdRef = useRef<string | null>(null);
  // Use ref to access latest results without causing dependency issues
  const resultsRef = useRef(results);
  useEffect(() => {
    resultsRef.current = results;
  }, [results]);

  // Track run ID when a new single question operation starts
  useEffect(() => {
    if (answeringQuestionIndex !== null && autoAnswerRun?.id) {
      currentRunIdRef.current = autoAnswerRun.id;
      processedMetadataRef.current = ""; // Clear processed metadata for new run
    } else if (answeringQuestionIndex === null) {
      currentRunIdRef.current = null; // Clear when no single question is active
    }
  }, [answeringQuestionIndex, autoAnswerRun?.id]);

  // Handle incremental answer updates from metadata (real-time)
  // This shows answers and statuses as individual questions complete
  useEffect(() => {
    // Read individual answers and statuses from metadata keys
    // Each answer-question task updates parent metadata when it starts and completes
    if (!autoAnswerRun?.metadata || !resultsRef.current) return;

    // For single question operations, only process metadata from the current run
    // This prevents metadata from previous runs (like "Auto Answer All") from interfering
    if (answeringQuestionIndex !== null) {
      if (
        currentRunIdRef.current &&
        autoAnswerRun.id !== currentRunIdRef.current
      ) {
        return; // Skip metadata from different runs
      }
    }

    const meta = autoAnswerRun.metadata as Record<string, unknown>;

    // Create a hash of current metadata values to detect actual changes
    // Include both keys and values to catch when metadata content changes
    const answerKeys = Object.keys(meta)
      .filter((key) => key.startsWith("answer_"))
      .sort();
    const statusKeys = Object.keys(meta)
      .filter((key) => key.startsWith("question_") && key.endsWith("_status"))
      .sort();

    // Build hash from actual values, not just keys
    const answerValues = answerKeys
      .map((key) => {
        const answer = meta[key] as
          | { questionIndex?: number; answer?: string | null }
          | undefined;
        return answer
          ? `${answer.questionIndex}:${answer.answer ? "has-answer" : "no-answer"}`
          : null;
      })
      .filter(Boolean);

    const statusValues = statusKeys.map((key) => {
      const status = meta[key];
      return `${key}:${status}`;
    });

    const metadataHash = JSON.stringify({
      answerCount: answerKeys.length,
      answerValues,
      statusCount: statusKeys.length,
      statusValues,
    });

    // Skip if we've already processed this exact metadata state
    if (processedMetadataRef.current === metadataHash) return;
    processedMetadataRef.current = metadataHash;

    const isSingleQuestion = answeringQuestionIndex !== null;

    // Build status map from individual status keys
    // For single question operations, only process status for that specific question
    const statusMap = new Map<number, "pending" | "processing" | "completed">();
    statusKeys.forEach((key) => {
      const match = key.match(/^question_(\d+)_status$/);
      if (match) {
        const questionIndex = parseInt(match[1], 10);

        // If this is a single question operation, only process status for that question
        if (isSingleQuestion && answeringQuestionIndex !== null) {
          if (questionIndex !== answeringQuestionIndex) {
            return; // Skip status updates for other questions
          }
        }

        const status = meta[key] as
          | "pending"
          | "processing"
          | "completed"
          | undefined;
        if (status) {
          statusMap.set(questionIndex, status);
        }
      }
    });

    // Update question statuses from metadata (individual spinners start at different times)
    if (statusMap.size > 0) {
      setQuestionStatuses((prev) => {
        const newStatuses = new Map(prev);
        let hasChanges = false;
        statusMap.forEach((status, questionIndex) => {
          if (prev.get(questionIndex) !== status) {
            newStatuses.set(questionIndex, status);
            hasChanges = true;
          }
        });
        return hasChanges ? newStatuses : prev;
      });
    }

    // Extract and update answers (reuse answerKeys from above)
    if (answerKeys.length > 0) {
      const answers = answerKeys
        .map((key) => {
          const answerData = meta[key] as
            | {
                questionIndex: number;
                question: string;
                answer: string | null;
                sources?: Array<{
                  sourceType: string;
                  sourceName?: string;
                  score: number;
                }>;
              }
            | undefined;
          return answerData;
        })
        .filter(
          (answer): answer is NonNullable<typeof answer> =>
            answer !== undefined,
        )
        .sort((a, b) => a.questionIndex - b.questionIndex);

      if (answers.length > 0) {
        setResults((prevResults) => {
          if (!prevResults) return prevResults;

          const updatedResults = [...prevResults];
          let hasChanges = false;

          answers.forEach((answer) => {
            // For single question operations, only process answers for that specific question
            if (isSingleQuestion && answeringQuestionIndex !== null) {
              // Strict check: must match exactly
              if (answer.questionIndex !== answeringQuestionIndex) {
                return; // Skip answers for other questions
              }
            }

            const targetIndex = answer.questionIndex;

            // Verify we're updating the correct question
            // For single question operations, double-check the index matches
            if (isSingleQuestion && answeringQuestionIndex !== null) {
              if (targetIndex !== answeringQuestionIndex) {
                console.warn("Index mismatch in single question update:", {
                  targetIndex,
                  answeringQuestionIndex,
                  answerQuestionIndex: answer.questionIndex,
                });
                return; // Skip if index doesn't match (safety check)
              }
            }

            // Safety check: ensure targetIndex is valid
            if (targetIndex < 0 || targetIndex >= updatedResults.length) {
              console.warn("Invalid questionIndex in answer update:", {
                targetIndex,
                resultsLength: updatedResults.length,
                answerQuestionIndex: answer.questionIndex,
              });
              return;
            }

            const currentAnswer = updatedResults[targetIndex]?.answer;
            const originalQuestion = updatedResults[targetIndex]?.question;

            // Verify we're updating the correct question by checking question text matches
            // This is an extra safety check to prevent updating wrong questions
            if (originalQuestion && answer.question) {
              // For single question operations, verify question text matches
              if (isSingleQuestion && answeringQuestionIndex !== null) {
                const expectedQuestion =
                  resultsRef.current?.[answeringQuestionIndex]?.question;
                if (
                  expectedQuestion &&
                  answer.question.trim() !== expectedQuestion.trim()
                ) {
                  console.warn(
                    "Question text mismatch in single question update:",
                    {
                      targetIndex,
                      answeringQuestionIndex,
                      expectedQuestion: expectedQuestion.substring(0, 50),
                      answerQuestion: answer.question.substring(0, 50),
                    },
                  );
                  // Still update if indices match - question text might be slightly different
                  // But log for debugging
                }
              }
            }

            // Always preserve the original question text from the results array
            // Don't use answer.question as it might be formatted differently or from a different question
            // This prevents question text from being overwritten incorrectly

            if (answer.answer) {
              if (currentAnswer !== answer.answer) {
                updatedResults[targetIndex] = {
                  question: originalQuestion || answer.question, // Preserve original question text
                  answer: answer.answer,
                  sources: answer.sources,
                  failedToGenerate: false,
                };
                hasChanges = true;
              }
            } else {
              // Only update if answer is still null (don't overwrite existing answers)
              if (!currentAnswer) {
                updatedResults[targetIndex] = {
                  ...updatedResults[targetIndex],
                  question: originalQuestion || answer.question, // Preserve original question text
                  answer: null,
                  failedToGenerate: true,
                };
                hasChanges = true;
              }
            }
          });

          return hasChanges ? updatedResults : prevResults;
        });
      }
    }
  }, [
    autoAnswerRun?.metadata,
    answeringQuestionIndex,
    // Don't include results, setResults, setQuestionStatuses, setAnsweringQuestionIndex in deps
    // results is only used for existence check, setState functions are stable
  ]);

  // Handle final completion (for toast notifications and cleanup only)
  // UI updates are handled by the metadata watcher above
  useEffect(() => {
    if (autoAnswerRun?.status === "COMPLETED" && autoAnswerRun.output) {
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
        const isSingleQuestion = answeringQuestionIndex !== null;

        // Mark all remaining "processing" questions as "completed" when orchestrator finishes
        // This fixes the issue where some questions stay stuck in "Generating answer..." state
        // For single question operations, only mark that specific question as completed
        if (results) {
          setQuestionStatuses((prev) => {
            const newStatuses = new Map(prev);
            if (isSingleQuestion && answeringQuestionIndex !== null) {
              // Single question: only mark that question as completed
              const currentStatus = prev.get(answeringQuestionIndex);
              if (currentStatus === "processing") {
                newStatuses.set(answeringQuestionIndex, "completed");
              }
            } else {
              // Batch operation: mark all processing questions as completed
              results.forEach((qa, index) => {
                const currentStatus = prev.get(index);
                if (currentStatus === "processing") {
                  newStatuses.set(index, "completed");
                }
              });
            }
            return newStatuses;
          });
        }

        // Cleanup: mark process as finished
        if (!isSingleQuestion) {
          isAutoAnswerProcessStartedRef.current = false;
          setIsAutoAnswerProcessStarted(false);
        }

        // Reset answering index and run ID for single questions
        if (isSingleQuestion) {
          setAnsweringQuestionIndex(null);
          currentRunIdRef.current = null; // Clear run ID when operation completes
        }

        // Show final toast notification
        const totalQuestions = answers.length;
        const answeredQuestions = answers.filter((a) => a.answer).length;
        const noAnswerQuestions = totalQuestions - answeredQuestions;

        if (isSingleQuestion) {
          if (answeredQuestions > 0) {
            toast.success("Answer generated successfully");
          } else {
            toast.warning(
              "Could not find relevant information in your policies for this question.",
            );
          }
        } else {
          if (answeredQuestions > 0) {
            toast.success(
              `Answered ${answeredQuestions} of ${totalQuestions} question${totalQuestions > 1 ? "s" : ""}${noAnswerQuestions > 0 ? `. ${noAnswerQuestions} had insufficient information.` : "."}`,
            );
          } else {
            toast.warning(
              `Could not find relevant information in your policies. Try adding more detail about ${answers[0]?.question.split(" ").slice(0, 5).join(" ")}...`,
            );
          }
        }
      }
    }
  }, [
    autoAnswerRun?.status,
    autoAnswerRun?.output,
    answeringQuestionIndex,
    results,
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
          if (status === "processing") {
            newStatuses.set(index, "completed");
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
      (autoAnswerRun?.status === "EXECUTING" ||
        autoAnswerRun?.status === "QUEUED") &&
      !isAutoAnswerProcessStarted &&
      isBatchOp
    ) {
      isAutoAnswerProcessStartedRef.current = true;
      setIsAutoAnswerProcessStarted(true);
    }
  }, [
    autoAnswerRun?.status,
    autoAnswerRun?.id,
    isAutoAnswerProcessStarted,
    setIsAutoAnswerProcessStarted,
    isAutoAnswerProcessStartedRef,
    answeringQuestionIndex,
  ]);

  // Handle task failures and cancellations
  useEffect(() => {
    if (
      autoAnswerRun?.status === "FAILED" ||
      autoAnswerRun?.status === "CANCELED"
    ) {
      isAutoAnswerProcessStartedRef.current = false;
      setIsAutoAnswerProcessStarted(false);
      const errorMessage =
        autoAnswerRun.error instanceof Error
          ? autoAnswerRun.error.message
          : typeof autoAnswerRun.error === "string"
            ? autoAnswerRun.error
            : "Task failed or was canceled";
      toast.error(`Failed to generate answer: ${errorMessage}`);

      // Mark all processing questions as completed on failure
      setQuestionStatuses((prev) => {
        const newStatuses = new Map(prev);
        prev.forEach((status, index) => {
          if (status === "processing") {
            newStatuses.set(index, "completed");
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

    const processStarted =
      isAutoAnswerProcessStartedRef.current || isAutoAnswerProcessStarted;

    if (processStarted) {
      if (
        autoAnswerRun?.status === "COMPLETED" ||
        autoAnswerRun?.status === "FAILED" ||
        autoAnswerRun?.status === "CANCELED"
      ) {
        return false;
      }
      return true;
    }

    const isRunActive =
      autoAnswerRun?.status === "EXECUTING" ||
      autoAnswerRun?.status === "QUEUED" ||
      autoAnswerRun?.status === "WAITING";

    if (isRunActive) {
      return true;
    }

    if (isAutoAnswerTriggering) {
      return true;
    }

    if (
      autoAnswerRun?.status === "COMPLETED" ||
      autoAnswerRun?.status === "FAILED" ||
      autoAnswerRun?.status === "CANCELED"
    ) {
      return false;
    }

    return false;
  }, [
    isAutoAnswerTriggering,
    autoAnswerRun?.status,
    isAutoAnswerProcessStarted,
    autoAnswerRun,
    isAutoAnswerProcessStartedRef,
    isBatchOperation,
  ]);

  return {
    triggerAutoAnswer,
    autoAnswerRun,
    autoAnswerError,
    isAutoAnswerTriggering,
    isAutoAnswering,
  };
}
