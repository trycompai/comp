import type {
  CheckRunAttempt,
  StoredCheckRun,
} from '../hooks/useIntegrationChecks';

export interface AccountRunGroup {
  connectionId: string;
  label: string;
  /** This account's runs, newest-first. */
  runs: StoredCheckRun[];
}

/**
 * Group check runs by the account (connection) they ran against. Checks run
 * once per connected account, so this is how the UI shows every account's
 * results when a customer has more than one (e.g. multiple AWS accounts).
 *
 * Input is expected newest-first; the output preserves that order both across
 * accounts (ordered by each account's most recent run) and within each account.
 */
export function groupRunsByConnection(
  runs: StoredCheckRun[],
): AccountRunGroup[] {
  const groups = new Map<string, AccountRunGroup>();
  for (const run of runs) {
    const existing = groups.get(run.connectionId);
    if (existing) {
      existing.runs.push(run);
    } else {
      groups.set(run.connectionId, {
        connectionId: run.connectionId,
        label: run.connectionLabel || 'Account',
        runs: [run],
      });
    }
  }
  return Array.from(groups.values());
}

export interface RunsSummary {
  accountCount: number;
  passed: number;
  failed: number;
  lastRunAt: string | null;
  hasFailed: boolean;
  hasSucceeded: boolean;
}

/**
 * Aggregate the latest run per account for the card header — so a multi-account
 * check shows totals across all accounts, not just the most recently run one.
 *
 * `lastAttempts` (optional, already filtered to this check) carries WHEN each
 * account last ran INCLUDING runs the server held back from `runs`. A check
 * whose recent runs are all held still ran — without this, "Last ran" froze at
 * the older visible run and customers read it as "the schedule stopped"
 * (CS-753). Counts/status always come from visible runs only, and a check with
 * no visible run at all keeps `lastRunAt: null` ("Not run yet") — held
 * outcomes stay hidden; only the timestamp advances.
 */
export function summarizeLatestPerAccount(
  runs: StoredCheckRun[],
  lastAttempts: CheckRunAttempt[] = [],
): RunsSummary {
  const groups = groupRunsByConnection(runs);
  let passed = 0;
  let failed = 0;
  let hasFailed = false;
  let hasSucceeded = false;
  let lastRunAt: string | null = null;

  for (const group of groups) {
    const latest = group.runs[0]; // newest-first
    if (!latest) continue;
    passed += latest.passedCount;
    failed += latest.failedCount;
    if (latest.status === 'failed' || latest.failedCount > 0) hasFailed = true;
    if (latest.status === 'success' && latest.failedCount === 0) {
      hasSucceeded = true;
    }
    const at = latest.completedAt || latest.createdAt;
    if (at && (!lastRunAt || new Date(at) > new Date(lastRunAt))) {
      lastRunAt = at;
    }
  }

  if (lastRunAt) {
    for (const attempt of lastAttempts) {
      if (
        attempt.lastAttemptAt &&
        new Date(attempt.lastAttemptAt) > new Date(lastRunAt)
      ) {
        lastRunAt = attempt.lastAttemptAt;
      }
    }
  }

  return {
    accountCount: groups.length,
    passed,
    failed,
    lastRunAt,
    hasFailed,
    hasSucceeded,
  };
}
