import type * as React from 'react';

export type RunStatus =
  | 'QUEUED'
  | 'PENDING'
  | 'RUNNING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELED'
  | 'TIMED_OUT'
  | 'INTERRUPTED'
  | 'SYSTEM_FAILURE'
  | 'UNKNOWN';

export type RunError = {
  message?: string;
  name?: string;
  stack?: string;
  [key: string]: unknown;
} | null;

export interface Run<TInput = unknown, TOutput = any> {
  id: string;
  taskIdentifier: string;
  status: RunStatus | string;
  output: TOutput | null;
  error: RunError;
  metadata: Record<string, unknown>;
  tags: string[];
  payload: TInput | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  attempt: number;
  isCompleted: boolean;
  isSuccess: boolean;
  isFailed: boolean;
  isCancelled: boolean;
  isTimedOut: boolean;
  ok: boolean;
}

export interface RealtimeRunOptions {
  accessToken?: string;
  enabled?: boolean;
  refreshInterval?: number;
  baseURL?: string;
  onComplete?: (run: any, error?: any) => void;
}

export interface RunResult<TInput = unknown, TOutput = any> {
  run: Run<TInput, TOutput> | null;
  error: RunError;
  isLoading: boolean;
}

export const TriggerAuthContext: React.Context<{
  accessToken?: string;
  baseURL?: string;
}>;

export function useRun<TInput = unknown, TOutput = any>(
  runId: string,
  opts?: RealtimeRunOptions,
): RunResult<TInput, TOutput>;

export function useRealtimeRun<TInput = unknown, TOutput = any>(
  runId: string,
  opts?: RealtimeRunOptions,
): RunResult<TInput, TOutput>;
