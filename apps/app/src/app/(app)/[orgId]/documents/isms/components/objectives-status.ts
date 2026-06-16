import type { IsmsObjectiveStatus } from '../isms-types';

/** The objective status vocabulary, in display order. */
export const OBJECTIVE_STATUSES = ['not_started', 'on_track', 'at_risk', 'met'] as const satisfies readonly IsmsObjectiveStatus[];

/** Human-readable labels for each objective status. */
export const OBJECTIVE_STATUS_LABELS: Record<IsmsObjectiveStatus, string> = {
  not_started: 'Not started',
  on_track: 'On track',
  at_risk: 'At risk',
  met: 'Met',
};
