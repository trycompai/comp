export type RunStatus =
  | 'WAITING_FOR_DEPLOY'
  | 'QUEUED'
  | 'EXECUTING'
  | 'REATTEMPTING'
  | 'FROZEN'
  | 'COMPLETED'
  | 'CANCELED'
  | 'FAILED'
  | 'CRASHED'
  | 'INTERRUPTED'
  | 'SYSTEM_FAILURE'
  | 'DELAYED'
  | 'EXPIRED'
  | 'TIMED_OUT';

const RUN_STATUS_VALUES_INTERNAL: readonly RunStatus[] = [
  'WAITING_FOR_DEPLOY',
  'QUEUED',
  'EXECUTING',
  'REATTEMPTING',
  'FROZEN',
  'COMPLETED',
  'CANCELED',
  'FAILED',
  'CRASHED',
  'INTERRUPTED',
  'SYSTEM_FAILURE',
  'DELAYED',
  'EXPIRED',
  'TIMED_OUT',
];

export const RUN_STATUS_VALUES = RUN_STATUS_VALUES_INTERNAL;

const KNOWN_STATUS_SET: ReadonlySet<RunStatus> = new Set<RunStatus>(RUN_STATUS_VALUES_INTERNAL);

const TERMINAL_STATUS_SET: ReadonlySet<RunStatus> = new Set<RunStatus>([
  'COMPLETED',
  'CANCELED',
  'FAILED',
  'CRASHED',
  'SYSTEM_FAILURE',
  'INTERRUPTED',
  'EXPIRED',
  'TIMED_OUT',
]);

const SUCCESS_STATUS_SET: ReadonlySet<RunStatus> = new Set<RunStatus>(['COMPLETED']);

const FAILURE_STATUS_SET: ReadonlySet<RunStatus> = new Set<RunStatus>([
  'FAILED',
  'CRASHED',
  'SYSTEM_FAILURE',
  'TIMED_OUT',
  'EXPIRED',
  'INTERRUPTED',
  'CANCELED',
]);

export const isRunStatus = (status: unknown): status is RunStatus =>
  typeof status === 'string' && KNOWN_STATUS_SET.has(status as RunStatus);

export const isTerminalRunStatus = (status: unknown): status is RunStatus =>
  isRunStatus(status) && TERMINAL_STATUS_SET.has(status);

export const isActiveRunStatus = (status: unknown): status is RunStatus =>
  isRunStatus(status) && !TERMINAL_STATUS_SET.has(status);

export const isSuccessfulRunStatus = (status: unknown): status is RunStatus =>
  isRunStatus(status) && SUCCESS_STATUS_SET.has(status);

export const isFailureRunStatus = (status: unknown): status is RunStatus =>
  isRunStatus(status) && FAILURE_STATUS_SET.has(status);
