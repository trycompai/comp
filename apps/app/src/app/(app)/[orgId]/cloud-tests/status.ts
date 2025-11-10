import type { TaskRunStatus } from '@trigger.dev/core';

const TASK_RUN_STATUS_VALUES = [
  'DELAYED',
  'PENDING',
  'PENDING_VERSION',
  'WAITING_FOR_DEPLOY',
  'DEQUEUED',
  'EXECUTING',
  'WAITING_TO_RESUME',
  'RETRYING_AFTER_FAILURE',
  'PAUSED',
  'CANCELED',
  'INTERRUPTED',
  'COMPLETED_SUCCESSFULLY',
  'COMPLETED_WITH_ERRORS',
  'SYSTEM_FAILURE',
  'CRASHED',
  'EXPIRED',
  'TIMED_OUT',
] as const satisfies readonly TaskRunStatus[];

const KNOWN_STATUS_SET: ReadonlySet<TaskRunStatus> = new Set<TaskRunStatus>(TASK_RUN_STATUS_VALUES);

const TERMINAL_STATUS_SET: ReadonlySet<TaskRunStatus> = new Set<TaskRunStatus>([
  'COMPLETED_SUCCESSFULLY',
  'COMPLETED_WITH_ERRORS',
  'CANCELED',
  'INTERRUPTED',
  'SYSTEM_FAILURE',
  'CRASHED',
  'EXPIRED',
  'TIMED_OUT',
  'PAUSED',
]);

const SUCCESS_STATUS_SET: ReadonlySet<TaskRunStatus> = new Set<TaskRunStatus>([
  'COMPLETED_SUCCESSFULLY',
]);

const FAILURE_STATUS_SET: ReadonlySet<TaskRunStatus> = new Set<TaskRunStatus>([
  'COMPLETED_WITH_ERRORS',
  'SYSTEM_FAILURE',
  'CRASHED',
  'TIMED_OUT',
  'EXPIRED',
  'INTERRUPTED',
  'CANCELED',
]);

export const isTaskRunStatus = (status: unknown): status is TaskRunStatus =>
  typeof status === 'string' && KNOWN_STATUS_SET.has(status as TaskRunStatus);

export const isTerminalRunStatus = (status: unknown): status is TaskRunStatus =>
  isTaskRunStatus(status) && TERMINAL_STATUS_SET.has(status);

export const isActiveRunStatus = (status: unknown): status is TaskRunStatus =>
  isTaskRunStatus(status) && !TERMINAL_STATUS_SET.has(status);

export const isSuccessfulRunStatus = (status: unknown): status is TaskRunStatus =>
  isTaskRunStatus(status) && SUCCESS_STATUS_SET.has(status);

export const isFailureRunStatus = (status: unknown): status is TaskRunStatus =>
  isTaskRunStatus(status) && FAILURE_STATUS_SET.has(status);


