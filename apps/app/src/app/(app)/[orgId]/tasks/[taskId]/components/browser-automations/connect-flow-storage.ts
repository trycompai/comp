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
 * A stored analysis is only resumable if it has the shape the connect flow reads
 * (`ConnectMethodChooser` calls `analysis.detectedMethods.includes(...)`, etc.).
 * A partial `{}` would crash the flow on mount, so treat it as unresumable.
 */
function isValidAnalysis(value: unknown): value is LoginAnalysis {
  if (typeof value !== 'object' || value === null) return false;
  const analysis = value as Partial<LoginAnalysis>;
  return (
    Array.isArray(analysis.detectedMethods) &&
    Array.isArray(analysis.extraFields) &&
    typeof analysis.identifierType === 'string' &&
    typeof analysis.recommendation === 'object' &&
    analysis.recommendation !== null
  );
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

    const hasUrl = typeof parsed?.url === 'string' && parsed.url.length > 0;

    // Reject anything we couldn't safely resume from: a stale entry, an
    // 'enter-url' without a string URL, or a 'choose' without a fully-shaped
    // analysis. A malformed url/analysis would otherwise crash the flow on mount.
    const resumable =
      (parsed?.step === 'enter-url' && hasUrl) ||
      (parsed?.step === 'choose' && isValidAnalysis(parsed.analysis));

    if (!isPersistedStep(parsed?.step) || !fresh || !resumable) {
      window.sessionStorage.removeItem(storageKey(taskId));
      return null;
    }

    return {
      step: parsed.step,
      url: typeof parsed.url === 'string' ? parsed.url : '',
      analysis: isValidAnalysis(parsed.analysis) ? parsed.analysis : null,
      savedAt: parsed.savedAt as number,
    };
  } catch {
    // Corrupt / unparseable entry — clear it so it doesn't linger and re-fail
    // (honors the documented "clears the entry" contract / self-heal).
    clearConnectState(taskId);
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
