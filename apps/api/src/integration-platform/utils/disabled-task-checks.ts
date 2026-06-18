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
 * connection has its own enable/disable state. Checks that are off by default
 * are stored under `enabledTaskChecks` only after the user reconnects them.
 */

export const DISABLED_TASK_CHECKS_KEY = 'disabledTaskChecks';
export const ENABLED_TASK_CHECKS_KEY = 'enabledTaskChecks';

export type DisabledTaskChecksMap = Record<string, string[]>;

function parseTaskChecksMap({
  metadata,
  key,
}: {
  metadata: unknown;
  key: string;
}): DisabledTaskChecksMap {
  if (!metadata || typeof metadata !== 'object') {
    return {};
  }
  const raw = (metadata as Record<string, unknown>)[key];
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
 * Parse the disabled task checks map from a connection's metadata JSON blob.
 * Returns an empty map if the metadata is missing, malformed, or doesn't
 * contain a `disabledTaskChecks` entry. Never throws.
 */
export function parseDisabledTaskChecks(
  metadata: unknown,
): DisabledTaskChecksMap {
  return parseTaskChecksMap({ metadata, key: DISABLED_TASK_CHECKS_KEY });
}

export function parseEnabledTaskChecks(
  metadata: unknown,
): DisabledTaskChecksMap {
  return parseTaskChecksMap({ metadata, key: ENABLED_TASK_CHECKS_KEY });
}

function removeCheckFromMap({
  map,
  taskId,
  checkId,
}: {
  map: DisabledTaskChecksMap;
  taskId: string;
  checkId: string;
}): DisabledTaskChecksMap {
  const current = map[taskId];
  if (!current?.includes(checkId)) return map;

  const nextChecks = current.filter((id) => id !== checkId);
  const nextMap: DisabledTaskChecksMap = { ...map };
  if (nextChecks.length === 0) {
    delete nextMap[taskId];
  } else {
    nextMap[taskId] = nextChecks;
  }
  return nextMap;
}

function addCheckToMap({
  map,
  taskId,
  checkId,
}: {
  map: DisabledTaskChecksMap;
  taskId: string;
  checkId: string;
}): DisabledTaskChecksMap {
  const current = map[taskId] ?? [];
  if (current.includes(checkId)) return map;
  return { ...map, [taskId]: [...current, checkId] };
}

export function isTaskCheckEnabled({
  metadata,
  taskId,
  checkId,
  enabledByDefault = true,
}: {
  metadata: unknown;
  taskId: string;
  checkId: string;
  enabledByDefault?: boolean;
}): boolean {
  const disabled = parseDisabledTaskChecks(metadata)[taskId] ?? [];
  if (disabled.includes(checkId)) return false;
  if (enabledByDefault) return true;

  const enabled = parseEnabledTaskChecks(metadata)[taskId] ?? [];
  return enabled.includes(checkId);
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
  return !isTaskCheckEnabled({ metadata, taskId, checkId });
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
  return withTaskCheckDisabled({ metadata, taskId, checkId });
}

export function withTaskCheckDisabled({
  metadata,
  taskId,
  checkId,
}: {
  metadata: unknown;
  taskId: string;
  checkId: string;
}): Record<string, unknown> {
  const base: Record<string, unknown> =
    metadata && typeof metadata === 'object'
      ? { ...(metadata as Record<string, unknown>) }
      : {};
  base[DISABLED_TASK_CHECKS_KEY] = addCheckToMap({
    map: parseDisabledTaskChecks(base),
    taskId,
    checkId,
  });
  base[ENABLED_TASK_CHECKS_KEY] = removeCheckFromMap({
    map: parseEnabledTaskChecks(base),
    taskId,
    checkId,
  });
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
  return withTaskCheckEnabled({ metadata, taskId, checkId });
}

export function withTaskCheckEnabled({
  metadata,
  taskId,
  checkId,
  enabledByDefault = true,
}: {
  metadata: unknown;
  taskId: string;
  checkId: string;
  enabledByDefault?: boolean;
}): Record<string, unknown> {
  const base: Record<string, unknown> =
    metadata && typeof metadata === 'object'
      ? { ...(metadata as Record<string, unknown>) }
      : {};
  base[DISABLED_TASK_CHECKS_KEY] = removeCheckFromMap({
    map: parseDisabledTaskChecks(base),
    taskId,
    checkId,
  });
  const enabledMap = parseEnabledTaskChecks(base);
  base[ENABLED_TASK_CHECKS_KEY] = enabledByDefault
    ? removeCheckFromMap({ map: enabledMap, taskId, checkId })
    : addCheckToMap({ map: enabledMap, taskId, checkId });
  return base;
}
