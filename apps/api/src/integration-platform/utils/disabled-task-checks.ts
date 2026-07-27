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
export const ENABLED_TASK_CHECKS_KEY = 'enabledTaskChecks';

export type DisabledTaskChecksMap = Record<string, string[]>;

const DEFAULT_DISCONNECTED_CHECK_IDS = new Set([
  'aws-environment-separation',
  'gcp-environment-separation',
  'azure-environment-separation',
]);

/**
 * Parse a task-check map from a connection's metadata JSON blob.
 * Returns an empty map if the metadata is missing, malformed, or doesn't
 * contain the requested entry. Never throws.
 */
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

function hasCheck({
  map,
  taskId,
  checkId,
}: {
  map: DisabledTaskChecksMap;
  taskId: string;
  checkId: string;
}): boolean {
  return map[taskId]?.includes(checkId) ?? false;
}

function addCheck({
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

function removeCheck({
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

function assignMap({
  metadata,
  key,
  map,
  deleteWhenEmpty = false,
}: {
  metadata: Record<string, unknown>;
  key: string;
  map: DisabledTaskChecksMap;
  deleteWhenEmpty?: boolean;
}) {
  if (deleteWhenEmpty && Object.keys(map).length === 0) {
    delete metadata[key];
    return;
  }
  metadata[key] = map;
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
  if (hasCheck({ map: parseDisabledTaskChecks(metadata), taskId, checkId })) {
    return true;
  }
  if (!DEFAULT_DISCONNECTED_CHECK_IDS.has(checkId)) {
    return false;
  }
  return !hasCheck({ map: parseEnabledTaskChecks(metadata), taskId, checkId });
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
  assignMap({
    metadata: base,
    key: DISABLED_TASK_CHECKS_KEY,
    map: addCheck({
      map,
      taskId,
      checkId,
    }),
  });
  assignMap({
    metadata: base,
    key: ENABLED_TASK_CHECKS_KEY,
    map: removeCheck({
      map: parseEnabledTaskChecks(base),
      taskId,
      checkId,
    }),
    deleteWhenEmpty: true,
  });
  return base;
}

function enableDefaultDisconnectedCheck({
  metadata,
  taskId,
  checkId,
}: {
  metadata: Record<string, unknown>;
  taskId: string;
  checkId: string;
}) {
  assignMap({
    metadata,
    key: ENABLED_TASK_CHECKS_KEY,
    map: addCheck({
      map: parseEnabledTaskChecks(metadata),
      taskId,
      checkId,
    }),
    deleteWhenEmpty: true,
  });
}

function removeFromDisabledChecks({
  metadata,
  taskId,
  checkId,
}: {
  metadata: Record<string, unknown>;
  taskId: string;
  checkId: string;
}) {
  assignMap({
    metadata,
    key: DISABLED_TASK_CHECKS_KEY,
    map: removeCheck({
      map: parseDisabledTaskChecks(metadata),
      taskId,
      checkId,
    }),
  });
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

  removeFromDisabledChecks({ metadata: base, taskId, checkId });
  if (DEFAULT_DISCONNECTED_CHECK_IDS.has(checkId)) {
    enableDefaultDisconnectedCheck({ metadata: base, taskId, checkId });
  }
  return base;
}
