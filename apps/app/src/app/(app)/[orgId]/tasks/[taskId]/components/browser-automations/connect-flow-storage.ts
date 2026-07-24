import type { LoginAnalysis } from '../../hooks/types';

// What a refresh can resume to. We never persist a live analysis-run token or a
// live sign-in session (both die on reload); instead we always keep the URL
// (resume at `enter-url`) and, once analysed, the result (resume at `choose`).
// Live sign-in steps fall back to `choose` so nothing is lost but the session.
export type PersistedStep = 'enter-url' | 'choose';

export interface PersistedConnectState {
  step: PersistedStep;
  url: string;
  analysis: LoginAnalysis | null;
  savedAt: number;
}

// Credentials/sessions are never here, so this is just a "stale draft" guard.
const MAX_AGE_MS = 60 * 60 * 1000;

const storageKey = (taskId: string) => `browser-connect-flow:${taskId}`;

function isPersistedStep(value: unknown): value is PersistedStep {
  return value === 'enter-url' || value === 'choose';
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

    // Reject anything we couldn't resume from: a stale entry, an 'enter-url'
    // with no URL, or a 'choose' with no analysis to show.
    const resumable =
      (parsed?.step === 'enter-url' && !!parsed.url) ||
      (parsed?.step === 'choose' && !!parsed.analysis);

    if (!isPersistedStep(parsed?.step) || !fresh || !resumable) {
      window.sessionStorage.removeItem(storageKey(taskId));
      return null;
    }

    return {
      step: parsed.step,
      url: parsed.url ?? '',
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
