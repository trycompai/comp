"use client";

import { type Dispatch, type SetStateAction, useEffect, useRef } from 'react';
import type { QuestionAnswer } from '../components/types';

type PersistedQuestionAnswer = QuestionAnswer & {
  originalIndex?: number;
  questionAnswerId?: string;
  status?: 'untouched' | 'generated' | 'manual';
};

type UpdateAnswerAction = {
  execute: (...args: any[]) => unknown;
  executeAsync: (...args: any[]) => Promise<unknown>;
};

interface UsePersistGeneratedAnswersParams<TResults extends PersistedQuestionAnswer[] | null> {
  questionnaireId: string | null;
  results: TResults;
  setResults: Dispatch<SetStateAction<TResults>>;
  autoAnswerRun: {
    metadata?: Record<string, unknown>;
    status?: string;
    output?: unknown;
  } | null;
  updateAnswerAction: UpdateAnswerAction;
  setQuestionStatuses: React.Dispatch<
    React.SetStateAction<Map<number, 'pending' | 'processing' | 'completed'>>
  >;
}

export function usePersistGeneratedAnswers<TResults extends PersistedQuestionAnswer[] | null>({
  questionnaireId,
  results,
  setResults,
  autoAnswerRun,
  updateAnswerAction,
  setQuestionStatuses,
}: UsePersistGeneratedAnswersParams<TResults>) {
  const processedMetadataAnswersRef = useRef<Set<string>>(new Set());
  const pendingMetadataUpdatesRef = useRef<
    Map<string, { questionAnswerId: string; answer: string; sources?: any[] }>
  >(new Map());
  const metadataUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const updateQueueRef = useRef<Promise<void>>(Promise.resolve());
  const resultsRef = useRef<PersistedQuestionAnswer[]>(results ?? []);
  const previousResultsRef = useRef<PersistedQuestionAnswer[]>(results ?? []);
  const processedResultsRef = useRef<Set<string>>(new Set());
  const resultsUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingResultsUpdatesRef = useRef<
    Map<string, { questionAnswerId: string; answer: string; sources?: any[] }>
  >(new Map());
  const pendingUpdatesWaitingForIdRef = useRef<
    Map<number, { answer: string; sources?: any[] }>
  >(new Map());

  useEffect(() => {
    resultsRef.current = results ?? [];
  }, [results]);

  useEffect(() => {
    previousResultsRef.current = results ?? [];
  }, [results]);

  useEffect(() => {
    return () => {
      if (metadataUpdateTimeoutRef.current) {
        clearTimeout(metadataUpdateTimeoutRef.current);
      }
      if (resultsUpdateTimeoutRef.current) {
        clearTimeout(resultsUpdateTimeoutRef.current);
      }
    };
  }, []);

  const enqueueUpdate = (
    key: string,
    payload: { questionAnswerId: string; answer: string; sources?: any[] },
    onError: () => void,
  ) => {
    if (!questionnaireId) {
      return;
    }

    updateQueueRef.current = updateQueueRef.current
      .catch(() => {
        // Swallow previous error to keep queue progressing
      })
      .then(async () => {
        try {
          await updateAnswerAction.executeAsync({
            questionnaireId,
            questionAnswerId: payload.questionAnswerId,
            answer: payload.answer,
            sources: payload.sources,
            status: 'generated',
          });
          console.log('Successfully updated answer in database:', {
            questionAnswerId: payload.questionAnswerId,
          });
        } catch (error) {
          console.error('Failed to update answer in database', error);
          onError();
        }

        await new Promise((resolve) => setTimeout(resolve, 200));
      });
  };

  useEffect(() => {
    if (!questionnaireId || !resultsRef.current.length || !autoAnswerRun?.metadata) {
      return;
    }

    const meta = autoAnswerRun.metadata as Record<string, unknown>;
    const answerKeys = Object.keys(meta).filter((key) => key.startsWith('answer_'));

    answerKeys.forEach((key) => {
      if (processedMetadataAnswersRef.current.has(key)) {
        return;
      }

      const answerData = meta[key] as {
        questionIndex?: number;
        answer?: string | null;
        sources?: any[];
      };

      if (!answerData || answerData.questionIndex === undefined || !answerData.answer) {
        return;
      }

      const resultMatch = resultsRef.current.find((r) => r.originalIndex === answerData.questionIndex);

      if (!resultMatch?.questionAnswerId) {
        pendingUpdatesWaitingForIdRef.current.set(answerData.questionIndex, {
          answer: answerData.answer || '',
          sources: answerData.sources,
        });
        return;
      }

      processedMetadataAnswersRef.current.add(key);
      pendingMetadataUpdatesRef.current.set(key, {
        questionAnswerId: resultMatch.questionAnswerId,
        answer: answerData.answer || '',
        sources: answerData.sources,
      });
    });

    if (metadataUpdateTimeoutRef.current) {
      clearTimeout(metadataUpdateTimeoutRef.current);
    }

    metadataUpdateTimeoutRef.current = setTimeout(() => {
      const updates = Array.from(pendingMetadataUpdatesRef.current.entries());
      pendingMetadataUpdatesRef.current.clear();

      updates.forEach(([key, update]) => {
        enqueueUpdate(key, update, () => {
          processedMetadataAnswersRef.current.delete(key);
        });
      });
    }, 500);
  }, [autoAnswerRun?.metadata, questionnaireId]);

  useEffect(() => {
    if (!questionnaireId || !results?.length) {
      return;
    }

    results.forEach((result) => {
      if (result.originalIndex == null) return;

      const pendingForIndex = pendingUpdatesWaitingForIdRef.current.get(result.originalIndex);

      if (pendingForIndex && result.questionAnswerId) {
        const answerKey = `${result.questionAnswerId}-${result.originalIndex}`;
        if (!processedResultsRef.current.has(answerKey)) {
          processedResultsRef.current.add(answerKey);
          pendingResultsUpdatesRef.current.set(answerKey, {
            questionAnswerId: result.questionAnswerId,
            answer: pendingForIndex.answer,
            sources: pendingForIndex.sources,
          });
        }
        pendingUpdatesWaitingForIdRef.current.delete(result.originalIndex);
      }

      if (!result.questionAnswerId) return;

      const prevResult = previousResultsRef.current.find((r) => r.originalIndex === result.originalIndex);
      const answerKey = `${result.questionAnswerId}-${result.originalIndex}`;

      if (processedResultsRef.current.has(answerKey)) {
        return;
      }

      if (
        result.answer &&
        result.answer.trim().length > 0 &&
        result.status !== 'manual' &&
        (!prevResult || prevResult.answer !== result.answer)
      ) {
        processedResultsRef.current.add(answerKey);
        pendingResultsUpdatesRef.current.set(answerKey, {
          questionAnswerId: result.questionAnswerId,
          answer: result.answer,
          sources: result.sources,
        });
      }
    });

    if (resultsUpdateTimeoutRef.current) {
      clearTimeout(resultsUpdateTimeoutRef.current);
    }

    resultsUpdateTimeoutRef.current = setTimeout(() => {
      const updates = Array.from(pendingResultsUpdatesRef.current.entries());
      pendingResultsUpdatesRef.current.clear();

      updates.forEach(([answerKey, update]) => {
        enqueueUpdate(answerKey, update, () => {
          processedResultsRef.current.delete(answerKey);
        });
      });
    }, 500);
  }, [questionnaireId, results]);

  useEffect(() => {
    if (!autoAnswerRun?.metadata || !resultsRef.current.length) {
      return;
    }

    const meta = autoAnswerRun.metadata as Record<string, unknown>;
    const answerKeys = Object.keys(meta).filter((key) => key.startsWith('answer_'));

    if (!answerKeys.length) {
      return;
    }

    const answers = answerKeys
      .map((key) => {
        const answer = meta[key] as {
          questionIndex: number;
          question: string;
          answer: string | null;
          sources?: Array<{
            sourceType: string;
            sourceName?: string;
            score: number;
          }>;
        };
        return answer;
      })
      .filter((answer): answer is NonNullable<typeof answer> => Boolean(answer))
      .sort((a, b) => a.questionIndex - b.questionIndex);

    if (!answers.length) {
      return;
    }

    setResults((prevResults) => {
      if (!prevResults) {
        return prevResults;
      }

      const updatedResults = [...prevResults];
      let hasChanges = false;

      answers.forEach((answer) => {
        const targetIndex = updatedResults.findIndex(
          (r) => r.originalIndex === answer.questionIndex,
        );

        if (targetIndex < 0 || targetIndex >= updatedResults.length) {
          return;
        }

        const currentAnswer = updatedResults[targetIndex]?.answer;
        const originalQuestion = updatedResults[targetIndex]?.question;

        if (answer.answer) {
          if (currentAnswer !== answer.answer) {
            updatedResults[targetIndex] = {
              ...updatedResults[targetIndex],
              question: originalQuestion || answer.question,
              answer: answer.answer,
              sources: answer.sources,
              failedToGenerate: false,
              status:
                updatedResults[targetIndex]?.status === 'manual'
                  ? 'manual'
                  : 'generated',
            };
            hasChanges = true;

            const statusKey = updatedResults[targetIndex]?.originalIndex ?? targetIndex;
            setQuestionStatuses((prevStatuses) => {
              const newStatuses = new Map(prevStatuses);
              if (prevStatuses.get(statusKey) !== 'completed') {
                newStatuses.set(statusKey, 'completed');
                return newStatuses;
              }
              return prevStatuses;
            });
          }
        } else if (!currentAnswer) {
          updatedResults[targetIndex] = {
            ...updatedResults[targetIndex],
            question: originalQuestion || answer.question,
            answer: null,
            failedToGenerate: true,
          };
          hasChanges = true;
        }
      });

      return (hasChanges ? updatedResults : prevResults) as TResults;
    });
  }, [autoAnswerRun?.metadata, setQuestionStatuses, setResults]);
}


