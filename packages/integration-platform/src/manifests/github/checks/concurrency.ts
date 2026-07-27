/**
 * Bounded-concurrency helper for GitHub checks that read many files.
 *
 * Some checks fetch one file per matching tree entry (every package.json /
 * requirements.txt in a monorepo, every workflow YAML). Reading them SERIALLY
 * meant a large repo — or any repo hitting GitHub's secondary rate limit, whose
 * per-request backoff sleeps stack up — took long enough to blow past the API's
 * HTTP request timeout on the synchronous manual-run path, so the run never
 * reported success and the task's "last ran"/result never updated. (The daily
 * scheduled run still finished because it executes in a long-lived Trigger.dev
 * task.) A bounded pool keeps even a large monorepo well under that ceiling
 * while staying far below GitHub's concurrent-request limit.
 */

/** Per-repo file reads to keep in flight at once. */
export const FILE_READ_CONCURRENCY = 10;

/**
 * Repositories to check in parallel within a single run. The branch-protection
 * check fetches protection rules (up to 3 strategies) plus recent PRs per
 * repo/branch; running repos SERIALLY meant an org with many monitored repos
 * (~28) issued ~250 sequential GitHub calls — with retry backoff stacking on
 * 429s — and blew past the synchronous manual-run HTTP timeout, so the run died
 * with no result persisted. A bounded pool keeps the run well under that ceiling
 * while staying far below GitHub's concurrent-request limit (each repo makes at
 * most ~2 requests in flight, so this caps total concurrency at ~16).
 */
export const REPO_CHECK_CONCURRENCY = 8;

/** Run `fn` over `items` with at most `limit` in flight, preserving order. */
export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  const worker = async (): Promise<void> => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await fn(items[index]);
    }
  };
  const workerCount = Math.min(Math.max(1, limit), items.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}
