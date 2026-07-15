import type { LoginAnalysis } from '../../hooks/types';

// Only the analysis phase is resumable — a live browser sign-in session can't
// survive a page unmount, and credentials are never persisted, so we only ever
// store these two steps.
export type PersistedStep = 'checking' | 'choose';

export interface PersistedConnectState {
  step: PersistedStep;
  url: string;
  analyzeRun: { runId: string; accessToken: string } | null;
  analysis: LoginAnalysis | null;
  savedAt: number;
}

// Past this window the Trigger.dev run and its public access token are almost
// certainly expired, so resuming would just error — start fresh instead.
const MAX_AGE_MS = 15 * 60 * 1000;

const storageKey = (taskId: string) => `browser-connect-flow:${taskId}`;

function isPersistedStep(value: unknown): value is PersistedStep {
  return value === 'checking' || value === 'choose';
}

/**
 * Read a saved in-flight connect session for this task. Returns null (and clears
 * the entry) when nothing is saved, the payload is malformed, or it's too old to
 * resume. Best-effort — never throws.
 */
export function loadConnectState(taskId: string): PersistedConnectState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(storageKey(taskId));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<PersistedConnectState>;
    const fresh =
      typeof parsed?.savedAt === 'number' &&
      Date.now() - parsed.savedAt <= MAX_AGE_MS;

    // Reject anything we couldn't actually resume from: a stale entry, a
    // 'checking' step with no run handle to re-subscribe to, or a 'choose' step
    // with no result to show.
    const resumable =
      (parsed?.step === 'checking' && !!parsed.analyzeRun) ||
      (parsed?.step === 'choose' && !!parsed.analysis);

    if (!isPersistedStep(parsed?.step) || !fresh || !resumable) {
      window.sessionStorage.removeItem(storageKey(taskId));
      return null;
    }

    return {
      step: parsed.step,
      url: parsed.url ?? '',
      analyzeRun: parsed.analyzeRun ?? null,
      analysis: parsed.analysis ?? null,
      savedAt: parsed.savedAt as number,
    };
  } catch {
    return null;
  }
}

export function saveConnectState(
  taskId: string,
  state: Omit<PersistedConnectState, 'savedAt'>,
): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(
      storageKey(taskId),
      JSON.stringify({ ...state, savedAt: Date.now() }),
    );
  } catch {
    // Best-effort — private mode / quota. Losing resume isn't fatal.
  }
}

export function clearConnectState(taskId: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(storageKey(taskId));
  } catch {
    // ignore
  }
}
