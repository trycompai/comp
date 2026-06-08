import type { AwsCommandStep } from './ai-remediation.prompt';

/**
 * Force the real CloudTrail log group onto every PutMetricFilter fix step.
 *
 * PutMetricFilter cannot work without the exact CloudWatch Logs log group, and
 * the AI must never be the source of truth for it (it guessed and failed before,
 * surfacing "could not determine which CloudTrail log group..."). The scan
 * resolves the real log group deterministically and carries it in the finding
 * evidence — `cloudWatchLogGroupName` for a missing filter, `logGroupName` for an
 * existing-filter update — so we overwrite the step's logGroupName from evidence,
 * guaranteeing the executed value is correct regardless of what the model
 * produced. No-op for any non-PutMetricFilter step or when no log group was
 * resolved (e.g. DescribeTrails was denied at scan time).
 */
export function applyResolvedMetricFilterLogGroup(
  steps: AwsCommandStep[],
  evidence: Record<string, unknown>,
): void {
  const fromName =
    typeof evidence.cloudWatchLogGroupName === 'string' &&
    evidence.cloudWatchLogGroupName.trim().length > 0
      ? evidence.cloudWatchLogGroupName
      : null;
  const fromExisting =
    typeof evidence.logGroupName === 'string' &&
    evidence.logGroupName.trim().length > 0
      ? evidence.logGroupName
      : null;
  const resolved = fromName ?? fromExisting;
  if (!resolved) return;

  for (const step of steps) {
    if (step.command !== 'PutMetricFilterCommand') continue;
    if (!step.params || typeof step.params !== 'object') continue;
    (step.params as Record<string, unknown>).logGroupName = resolved;
  }
}
