'use client';

import { Badge, Skeleton, Text } from '@trycompai/design-system';

export interface TaskRequirementItem {
  label: string;
  completed: number;
  total: number;
  /** 'count' renders a colored "x/y"; 'binary' renders a status badge. */
  kind: 'count' | 'binary';
  /**
   * Explicit badge state for binary requirements whose status comes from an
   * external source (e.g. 2FA). 'not-provided' = the source had no data for
   * this member — distinct from 'missing' (an explicit failure). When omitted,
   * the state derives from completed/total.
   */
  state?: 'done' | 'missing' | 'not-provided';
}

function TaskRequirementRow({ item }: { item: TaskRequirementItem }) {
  const { label, completed, total, kind } = item;
  const isComplete = total > 0 && completed >= total;
  const state = item.state ?? (isComplete ? 'done' : 'missing');

  return (
    <div className="flex items-center gap-2" data-testid={`requirement-${label}`}>
      <div className="w-24 shrink-0">
        <Text size="xs" variant="muted">
          {label}
        </Text>
      </div>

      {kind === 'binary' ? (
        state === 'not-provided' ? (
          <Badge variant="outline">Not provided</Badge>
        ) : (
          <Badge variant={state === 'done' ? 'accent' : 'secondary'}>
            {state === 'done' ? 'Done' : 'Missing'}
          </Badge>
        )
      ) : (
        // pl-1.5 matches the Badge's inner padding so counts and badge text
        // share one vertical line across rows. The colored count alone carries
        // the state (green done / amber partial / muted none) — no bar needed.
        <div className="pl-1.5">
          <Text size="xs" variant={isComplete ? 'success' : completed > 0 ? 'warning' : 'muted'}>
            {completed}/{total}
          </Text>
        </div>
      )}
    </div>
  );
}

/**
 * Per-employee requirement rollup shown in the People list TASKS column.
 * Each requirement is on its own row: fractional requirements (policies, training)
 * show a colored count; binary requirements (HIPAA, device, background)
 * show a Done/Missing badge.
 */
export function TaskRequirements({
  items,
  showLoadingRow = false,
}: {
  items: TaskRequirementItem[];
  showLoadingRow?: boolean;
}) {
  if (items.length === 0 && !showLoadingRow) {
    return (
      <Text size="sm" variant="muted">
        —
      </Text>
    );
  }

  return (
    // Content-sized (w-max): label column + value only — the column stays
    // compact regardless of table width.
    <div className="flex w-max flex-col gap-0.5">
      {items.map((item) => (
        <TaskRequirementRow key={item.label} item={item} />
      ))}
      {showLoadingRow && (
        <div className="h-3 w-16" data-testid="task-requirements-loading">
          <Skeleton style={{ height: '100%', width: '100%' }} />
        </div>
      )}
    </div>
  );
}
