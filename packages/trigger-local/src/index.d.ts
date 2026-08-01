import type { z } from 'zod';

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

export interface RetryOptions {
  maxAttempts?: number;
  factor?: number;
  minTimeoutInMs?: number;
  maxTimeoutInMs?: number;
  timeoutInMs?: number;
}

export interface Queue {
  name?: string;
  concurrencyLimit?: number;
}

export interface TaskTriggerOptions {
  delayUntil?: Date | string;
  idempotencyKey?: string;
  idempotencyKeyTTL?: number | string;
  tags?: string[];
  concurrencyKey?: string;
  traceContext?: unknown;
}

export interface TaskTriggerHandle {
  id: string;
  publicAccessToken: string;
  url: string;
}

export interface TaskBatchHandle {
  batchId: string;
  runs: Array<TaskTriggerHandle>;
}

export interface BatchResult<TInput = unknown, TOutput = unknown> {
  id: string;
  runs: Array<Run<TInput, TOutput>>;
}

export interface RunContext {
  run: Run<unknown, unknown>;
  ctx: { run: Run<unknown, unknown>; [key: string]: unknown };
  attempt: number;
  logger: unknown;
  metadata: MetadataHandle;
  tags: unknown;
}

export type RunError = {
  message?: string;
  name?: string;
  stack?: string;
  [key: string]: unknown;
} | null;

export interface Run<TInput = unknown, TOutput = unknown> {
  id: string;
  taskIdentifier: string;
  status: RunStatus | string;
  output: TOutput | undefined;
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

export interface Task<TID extends string = string, TInput = unknown, TOutput = unknown> {
  id: TID;
  trigger(payload?: TInput, opts?: TaskTriggerOptions): Promise<TaskTriggerHandle>;
  batchTrigger(
    payloads: Array<{ payload: TInput }>,
    opts?: TaskTriggerOptions,
  ): Promise<TaskBatchHandle>;
  triggerAndWait(
    payload: TInput,
    opts?: TaskTriggerOptions,
  ): Promise<Run<TInput, TOutput>>;
  batchTriggerAndWait(
    payloads: Array<{ payload: TInput }>,
    opts?: TaskTriggerOptions,
  ): Promise<BatchResult<TInput, TOutput>>;
}

export interface SchedulePayload {
  timestamp: string;
  lastTimestamp: string | null;
  runAt: string;
  timezone?: string;
}

interface TaskDefinition<TID extends string, TInput, TOutput> {
  id: TID;
  run: (payload: TInput, ctx: RunContext) => TOutput | Promise<TOutput>;
  queue?: Queue | string;
  retry?: RetryOptions;
  maxDuration?: number;
  concurrencyLimit?: number;
  machine?: unknown;
  middleware?: unknown;
  onSuccess?: unknown;
  onFailure?: unknown;
}

interface SchemaTaskDefinition<TID extends string, TSchema extends z.ZodTypeAny, TOutput> {
  id: TID;
  schema: TSchema;
  run: (
    payload: z.output<TSchema>,
    ctx: RunContext,
  ) => TOutput | Promise<TOutput>;
  queue?: Queue | string;
  retry?: RetryOptions;
  maxDuration?: number;
  concurrencyLimit?: number;
  machine?: unknown;
  middleware?: unknown;
  onSuccess?: unknown;
  onFailure?: unknown;
}

interface ScheduleTaskDefinition<TID extends string, TOutput> {
  id: TID;
  cron: string;
  run: (
    payload: SchedulePayload,
    ctx: RunContext,
  ) => TOutput | Promise<TOutput>;
  timezone?: string;
  retry?: RetryOptions;
  maxDuration?: number;
  queue?: Queue | string;
  enabled?: boolean;
  machine?: unknown;
}

export function task<TID extends string, TInput = unknown, TOutput = unknown>(
  opts: TaskDefinition<TID, TInput, TOutput>,
): Task<TID, TInput, TOutput>;

export function schemaTask<
  TID extends string,
  TSchema extends z.ZodTypeAny,
  TOutput = unknown,
>(
  opts: SchemaTaskDefinition<TID, TSchema, TOutput>,
): Task<TID, z.input<TSchema>, TOutput>;

export const tasks: {
  trigger<TTask extends Task<string, unknown, unknown> = Task>(
    taskId: TTask['id'],
    payload?: TTask extends Task<string, infer TInput, unknown> ? TInput : unknown,
    opts?: TaskTriggerOptions,
  ): Promise<TaskTriggerHandle>;
  batchTrigger<TTask extends Task<string, unknown, unknown> = Task>(
    taskId: TTask['id'],
    payloads: Array<{
      payload: TTask extends Task<string, infer TInput, unknown> ? TInput : unknown;
    }>,
    opts?: TaskTriggerOptions,
  ): Promise<TaskBatchHandle>;
  triggerAndWait<TTask extends Task<string, unknown, unknown> = Task>(
    taskId: TTask['id'],
    payload?: TTask extends Task<string, infer TInput, unknown> ? TInput : unknown,
    opts?: TaskTriggerOptions,
  ): Promise<Run<unknown, unknown>>;
  batchTriggerAndWait<TTask extends Task<string, unknown, unknown> = Task>(
    taskId: TTask['id'],
    payloads: Array<{
      payload: TTask extends Task<string, infer TInput, unknown> ? TInput : unknown;
    }>,
    opts?: TaskTriggerOptions,
  ): Promise<BatchResult<unknown, unknown>>;
};

export const runs: {
  retrieve<TInput = unknown, TOutput = unknown>(
    runId: string,
  ): Promise<Run<TInput, TOutput>>;
  getRun<TInput = unknown, TOutput = unknown>(
    runId: string,
  ): Promise<Run<TInput, TOutput> | null>;
  cancel(runId: string): Promise<Run | null>;
  list<TInput = unknown, TOutput = unknown>(opts?: {
    limit?: number;
  }): Promise<Array<Run<TInput, TOutput>>>;
};

export const schedules: {
  task<TID extends string, TOutput = unknown>(
    opts: ScheduleTaskDefinition<TID, TOutput>,
  ): Task<TID, SchedulePayload, TOutput>;
  cron(opts: {
    id?: string;
    cron: string;
    task: Task<string, unknown, unknown>;
    timezone?: string;
    enabled?: boolean;
  }): { id: string };
  start(): void;
  stop(): void;
};

export interface PublicTokenOptions {
  scopes?: Record<string, unknown>;
  expirationTime?: string | number;
  expiresAt?: string | Date;
}

export interface TriggerPublicTokenOptions {
  multipleUse?: boolean;
  expirationTime?: string | number;
  expiresAt?: string | Date;
  scopes?: Record<string, unknown>;
}

export const auth: {
  createPublicToken(opts?: PublicTokenOptions): Promise<string>;
  createTriggerPublicToken(
    taskId: string,
    opts?: TriggerPublicTokenOptions,
  ): Promise<string>;
  getPayloadFromJWT<T = unknown>(token: string): Promise<T | null>;
};

export interface MetadataHandle {
  root?: MetadataHandle;
  parent?: MetadataHandle;
  set(key: string, value: unknown): MetadataHandle;
  get(key: string): unknown;
  increment(key: string, amount?: number): MetadataHandle;
  decrement(key: string, amount?: number): MetadataHandle;
  current(): Record<string, unknown>;
  snapshot(): Record<string, unknown>;
  flush(): Promise<void>;
}

export const metadata: MetadataHandle;

export const tags: {
  add(tags: string[]): Promise<void>;
  set(tags: string[]): Promise<void>;
};

export const logger: {
  debug(message: unknown, ...args: unknown[]): void;
  info(message: unknown, ...args: unknown[]): void;
  warn(message: unknown, ...args: unknown[]): void;
  error(message: unknown, ...args: unknown[]): void;
  log(message: unknown, ...args: unknown[]): void;
  flush(): Promise<void>;
};

export function queue<T extends Queue = Queue>(opts: T | string): T;
export function defineConfig<T extends Record<string, unknown>>(config: T): T;

export function registerFromDirectory(
  dir: string,
  opts?: {
    ignore?: RegExp[];
  }): void;
