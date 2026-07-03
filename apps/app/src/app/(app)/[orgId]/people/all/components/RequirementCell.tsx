'use client';

import { Badge, Skeleton, Text } from '@trycompai/design-system';

/** Muted dash for a requirement that doesn't apply to this member. */
export function RequirementDash() {
  return (
    <Text size="sm" variant="muted">
      —
    </Text>
  );
}

/**
 * Fractional requirement (policies, training): a colored count. 'primary' is
 * the brand green, matching the Done badge; amber = partial; muted = none.
 */
export function RequirementCount({
  label,
  completed,
  total,
}: {
  label: string;
  completed: number;
  total: number;
}) {
  const isComplete = total > 0 && completed >= total;
  return (
    <div data-testid={`requirement-${label}`}>
      <Text
        size="xs"
        variant={isComplete ? 'primary' : completed > 0 ? 'warning' : 'muted'}
      >
        {completed}/{total}
      </Text>
    </div>
  );
}

/**
 * Binary requirement (HIPAA, device, background, 2FA): a status badge.
 * 'not-provided' = the source had no data for this member — distinct from an
 * explicit 'missing' failure.
 */
export function RequirementBadge({
  label,
  state,
}: {
  label: string;
  state: 'done' | 'missing' | 'not-provided';
}) {
  return (
    <div data-testid={`requirement-${label}`}>
      {state === 'not-provided' ? (
        <Badge variant="outline">Not provided</Badge>
      ) : (
        <Badge variant={state === 'done' ? 'accent' : 'secondary'}>
          {state === 'done' ? 'Done' : 'Missing'}
        </Badge>
      )}
    </div>
  );
}

/** Loading placeholder while a requirement's status is still resolving. */
export function RequirementLoading() {
  return (
    <div className="h-3 w-16" data-testid="task-requirements-loading">
      <Skeleton style={{ height: '100%', width: '100%' }} />
    </div>
  );
}
