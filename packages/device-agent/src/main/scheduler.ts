import { runAllChecks } from '../checks';
import { CHECK_INTERVAL_MS } from '../shared/constants';
import type { CheckResult } from '../shared/types';
import { log } from './logger';
import { reportCheckResults } from './reporter';
import { getAuth, getCheckInterval, setLastCheckResults } from './store';

let checkTimer: ReturnType<typeof setInterval> | null = null;
let isRunning = false;

type CheckCallback = (results: CheckResult[], isCompliant: boolean) => void;
type SessionExpiredCallback = () => void;

let onSessionExpired: SessionExpiredCallback | null = null;

/**
 * Registers a callback for when the session token is rejected (401).
 */
export function setSessionExpiredHandler(handler: SessionExpiredCallback): void {
  onSessionExpired = handler;
}

/**
 * Starts the periodic compliance check scheduler.
 * Runs an initial check immediately, then repeats on the configured interval.
 */
export function startScheduler(onCheckComplete: CheckCallback): void {
  if (checkTimer) {
    clearInterval(checkTimer);
  }

  // Run immediately
  runChecksAndReport(onCheckComplete);

  // Then schedule periodic checks
  const interval = getCheckInterval() || CHECK_INTERVAL_MS;
  checkTimer = setInterval(() => {
    runChecksAndReport(onCheckComplete);
  }, interval);

  log(`Scheduler started: checks every ${interval / 1000 / 60} minutes`);
}

/**
 * Stops the periodic scheduler.
 */
export function stopScheduler(): void {
  if (checkTimer) {
    clearInterval(checkTimer);
    checkTimer = null;
  }
  log('Scheduler stopped');
}

/**
 * Triggers an immediate check run outside the normal schedule.
 */
export async function runChecksNow(onCheckComplete: CheckCallback): Promise<void> {
  await runChecksAndReport(onCheckComplete);
}

/**
 * Runs all checks and reports results to ALL registered organizations.
 */
async function runChecksAndReport(onCheckComplete: CheckCallback): Promise<void> {
  if (isRunning) {
    log('Check already in progress, skipping');
    return;
  }

  const auth = getAuth();
  if (!auth) {
    log('Not authenticated, skipping check');
    return;
  }

  isRunning = true;

  try {
    log(`Running compliance checks (reporting to ${auth.organizations.length} org(s))...`);
    const results = await runAllChecks();
    setLastCheckResults(results);

    // Report to all organizations
    const { isCompliant, sessionExpired } = await reportCheckResults(results);

    if (sessionExpired) {
      log('Session expired during check-in, triggering re-authentication');
      onSessionExpired?.();
      return;
    }

    log(`Check complete: ${isCompliant ? 'COMPLIANT' : 'NON-COMPLIANT'}`);
    onCheckComplete(results, isCompliant);
  } catch (error) {
    log(`Error during check cycle: ${error}`, 'ERROR');
    const results: CheckResult[] = [
      {
        checkType: 'disk_encryption' as const,
        passed: false,
        details: { method: 'error', raw: String(error), message: 'Check cycle failed' },
        checkedAt: new Date().toISOString(),
      },
    ];
    onCheckComplete(results, false);
  } finally {
    isRunning = false;
  }
}
