/**
 * Bounded retry for AWS STS `AssumeRole` calls.
 *
 * Why this exists: assuming a customer's cross-account role is a two-hop STS
 * flow, and the FIRST attempt right after a connection is set up (or its trust
 * policy edited) can fail transiently with NO change in AWS — IAM/STS is
 * eventually consistent, so a brand-new/edited role can return `AccessDenied`
 * on the first assume and then succeed seconds later. The base/roleAssumer
 * session can likewise briefly return `ExpiredToken`. None of these classes are
 * retried by the AWS SDK's default strategy (it only retries throttling/5xx/
 * network), so a single transient failure surfaced to customers as a sticky
 * "Could not assume AWS role" finding that "fixed itself" on the next run.
 *
 * This helper retries only those transient/eventually-consistent classes with
 * capped exponential backoff + jitter. Hard configuration errors (bad ARN,
 * ValidationError) and a role that is *persistently* denied still propagate —
 * the backoff is capped so a genuinely broken role fails within a few seconds.
 */

const RETRYABLE_ASSUME_ERROR_NAMES = new Set<string>([
  // IAM/STS eventual consistency on a new or just-edited cross-account role.
  'AccessDenied',
  'AccessDeniedException',
  // Base/roleAssumer session momentarily expired, or an STS hiccup.
  'ExpiredToken',
  'ExpiredTokenException',
  'IDPCommunicationError',
  'RegionDisabledException',
  // Standard transient classes (belt-and-suspenders alongside the SDK).
  'Throttling',
  'ThrottlingException',
  'TooManyRequestsException',
  'RequestLimitExceeded',
  'ServiceUnavailable',
  'ServiceUnavailableException',
  'InternalError',
  'InternalFailure',
]);

export function isRetryableAssumeError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const e = error as {
    name?: string;
    Code?: string;
    code?: string;
    __type?: string;
    message?: string;
    $metadata?: { httpStatusCode?: number };
  };
  const name = e.name ?? e.Code ?? e.code ?? e.__type ?? '';
  if (RETRYABLE_ASSUME_ERROR_NAMES.has(name)) return true;

  const status = e.$metadata?.httpStatusCode;
  if (typeof status === 'number' && status >= 500) return true;

  return /ECONNRESET|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|socket hang up|network|timeout/i.test(
    e.message ?? '',
  );
}

export interface RetryAssumeOptions {
  /** Total attempts including the first (default 4). */
  attempts?: number;
  /** Base backoff in ms; grows exponentially, capped by maxDelayMs (default 500). */
  baseDelayMs?: number;
  /** Maximum backoff per attempt in ms (default 5000). */
  maxDelayMs?: number;
  /** Injectable sleep so tests don't actually wait. */
  sleep?: (ms: number) => Promise<void>;
  /** Injectable jitter source in [0, 1); defaults to Math.random. */
  random?: () => number;
}

const defaultSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Run `fn` (an AssumeRole call) with bounded exponential backoff + jitter,
 * retrying only transient/eventually-consistent failures. Non-transient errors
 * propagate immediately; transient ones that never recover propagate after the
 * attempts are exhausted.
 */
export async function retryAssume<T>(
  fn: () => Promise<T>,
  options: RetryAssumeOptions = {},
): Promise<T> {
  const attempts = Math.max(1, options.attempts ?? 4);
  const baseDelayMs = options.baseDelayMs ?? 500;
  const maxDelayMs = options.maxDelayMs ?? 5000;
  const sleep = options.sleep ?? defaultSleep;
  const random = options.random ?? Math.random;

  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const isLastAttempt = attempt === attempts - 1;
      if (isLastAttempt || !isRetryableAssumeError(error)) throw error;
      const backoff = Math.min(maxDelayMs, baseDelayMs * 2 ** attempt);
      await sleep(backoff + Math.floor(backoff * 0.5 * random()));
    }
  }
  throw lastError;
}
