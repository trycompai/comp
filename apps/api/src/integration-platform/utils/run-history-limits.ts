import type { Prisma } from '@db';

/**
 * Caps applied to a check run before it is serialized into the `/runs` list
 * response.
 *
 * A single check can legitimately produce an enormous result set — e.g. a
 * Firebase B2C tenant whose "employee access" check enumerates tens of
 * thousands of auth users (one IntegrationCheckResult per user, each with its
 * own `evidence` blob) plus a long `logs` array. Shipping all of that for every
 * run in the history window yields a multi-MB payload the browser must
 * download, `JSON.parse`, and hold in the SWR cache — which OOM-crashes the
 * renderer ("Aw, Snap!").
 *
 * The run's summary counts (passedCount / failedCount / exceptedCount) are
 * authoritative and computed from the FULL result set before trimming, so the
 * UI still shows true totals and a correct "+N more" — only the per-result
 * detail it actually renders is shipped.
 */

/** Per category (findings / excepted / passing) — the UI shows at most 3. */
export const MAX_RESULTS_PER_CATEGORY = 5;

/** Max log entries shipped per run. */
export const MAX_LOGS_PER_RUN = 100;

/**
 * Max serialized size (chars) of a single result's evidence before it is
 * replaced with a compact placeholder. Generous so normal evidence is left
 * untouched; only a pathologically large blob is trimmed.
 */
export const MAX_EVIDENCE_BYTES = 20_000;

type CategorizableResult = { passed: boolean; excepted: boolean };

/**
 * Keep at most {@link MAX_RESULTS_PER_CATEGORY} results from each of the three
 * categories the UI renders (findings, excepted, passing), preserving input
 * order within each category. Bounds the result array regardless of how many
 * rows the check produced.
 */
export function capResultsForList<T extends CategorizableResult>(
  results: T[],
): T[] {
  const findings: T[] = [];
  const excepted: T[] = [];
  const passing: T[] = [];

  for (const r of results) {
    const bucket = r.passed ? passing : r.excepted ? excepted : findings;
    if (bucket.length < MAX_RESULTS_PER_CATEGORY) bucket.push(r);
  }

  return [...findings, ...excepted, ...passing];
}

/**
 * Replace an oversized evidence blob with a compact placeholder so a single
 * pathologically large result (e.g. one aggregate result whose evidence is the
 * full user list) can't blow up the payload or the JSON tree the UI renders.
 */
export function capEvidence(
  evidence: Prisma.JsonValue | null | undefined,
): Prisma.JsonValue | null | undefined {
  if (evidence === null || evidence === undefined) return evidence;

  let serialized: string;
  try {
    serialized = JSON.stringify(evidence);
  } catch {
    // Non-serializable (shouldn't happen for stored JSON) — leave as-is.
    return evidence;
  }
  if (serialized.length <= MAX_EVIDENCE_BYTES) return evidence;

  return {
    truncated: true,
    message:
      'Evidence is too large to display here. Re-run or export the check to view the full data.',
    sizeBytes: serialized.length,
  };
}

/**
 * Bound the per-run log array. Logs are an unstructured JSON value; only an
 * array is trimmed — anything else is passed through untouched.
 */
export function capLogs(
  logs: Prisma.JsonValue | null | undefined,
): Prisma.JsonValue | null | undefined {
  if (Array.isArray(logs)) return logs.slice(0, MAX_LOGS_PER_RUN);
  return logs;
}
