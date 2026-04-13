/**
 * Helpers for reading and writing per-task disabled integration checks from
 * `IntegrationConnection.metadata`.
 *
 * Per-task disable state is stored under `metadata.disabledTaskChecks` as a map
 * from task ID to the list of manifest check IDs that are disabled for that
 * task on this connection. Example:
 *
 *   {
 *     ...otherMetadata,
 *     disabledTaskChecks: {
 *       "tsk_abc123": ["branch_protection", "dependabot"],
 *       "tsk_xyz789": ["sanitized_inputs"]
 *     }
 *   }
 *
 * Storing on the connection gives us "reconnect = fresh state" for free and
 * transparently supports orgs with multiple connections per provider — each
 * connection has its own disable state.
 */

export const DISABLED_TASK_CHECKS_KEY = 'disabledTaskChecks';

export type DisabledTaskChecksMap = Record<string, string[]>;

/**
 * Parse the disabled task checks map from a connection's metadata JSON blob.
 * Returns an empty map if the metadata is missing, malformed, or doesn't
 * contain a `disabledTaskChecks` entry. Never throws.
 */
export function parseDisabledTaskChecks(
  metadata: unknown,
): DisabledTaskChecksMap {
  if (!metadata || typeof metadata !== 'object') {
    return {};
  }
  const raw = (metadata as Record<string, unknown>)[DISABLED_TASK_CHECKS_KEY];
  if (!raw || typeof raw !== 'object') {
    return {};
  }

  const result: DisabledTaskChecksMap = {};
  for (const [taskId, checkIds] of Object.entries(
    raw as Record<string, unknown>,
  )) {
    if (!Array.isArray(checkIds)) continue;
    const cleaned = checkIds.filter(
      (id): id is string => typeof id === 'string' && id.length > 0,
    );
    if (cleaned.length > 0) {
      result[taskId] = cleaned;
    }
  }
  return result;
}

/**
 * Returns true if the given checkId is disabled for the given taskId on this
 * connection's metadata.
 */
export function isCheckDisabledForTask(
  metadata: unknown,
  taskId: string,
  checkId: string,
): boolean {
  const map = parseDisabledTaskChecks(metadata);
  const disabled = map[taskId];
  return Array.isArray(disabled) && disabled.includes(checkId);
}

/**
 * Returns a new metadata object with the given check marked as disabled for
 * the given task. Does not mutate the input. If the check is already disabled,
 * returns the metadata unchanged (same reference).
 */
export function withCheckDisabled(
  metadata: unknown,
  taskId: string,
  checkId: string,
): Record<string, unknown> {
  const base: Record<string, unknown> =
    metadata && typeof metadata === 'object'
      ? { ...(metadata as Record<string, unknown>) }
      : {};
  const map = parseDisabledTaskChecks(base);
  const current = map[taskId] ?? [];
  if (current.includes(checkId)) {
    // Already disabled — return a merged copy so callers can safely write back.
    base[DISABLED_TASK_CHECKS_KEY] = map;
    return base;
  }
  const nextMap: DisabledTaskChecksMap = {
    ...map,
    [taskId]: [...current, checkId],
  };
  base[DISABLED_TASK_CHECKS_KEY] = nextMap;
  return base;
}

/**
 * Returns a new metadata object with the given check re-enabled for the given
 * task. Cleans up empty arrays. If the check wasn't disabled, returns a merged
 * copy unchanged.
 */
export function withCheckEnabled(
  metadata: unknown,
  taskId: string,
  checkId: string,
): Record<string, unknown> {
  const base: Record<string, unknown> =
    metadata && typeof metadata === 'object'
      ? { ...(metadata as Record<string, unknown>) }
      : {};
  const map = parseDisabledTaskChecks(base);
  const current = map[taskId];
  if (!current || !current.includes(checkId)) {
    base[DISABLED_TASK_CHECKS_KEY] = map;
    return base;
  }
  const nextChecks = current.filter((id) => id !== checkId);
  const nextMap: DisabledTaskChecksMap = { ...map };
  if (nextChecks.length === 0) {
    delete nextMap[taskId];
  } else {
    nextMap[taskId] = nextChecks;
  }
  base[DISABLED_TASK_CHECKS_KEY] = nextMap;
  return base;
}
