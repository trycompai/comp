import { db } from '@db';

/**
 * Metadata about one active exception. Display surfaces use it to show the
 * documented reason next to a suppressed finding and to offer revoke (which
 * needs the row id) without a second query.
 */
export interface ActiveExceptionInfo {
  id: string;
  reason: string;
}

/**
 * The set of findings — keyed by (connectionId, checkId, resourceId) — that
 * currently have an ACTIVE exception (not revoked, not expired) for an org.
 *
 * This is the SINGLE source of truth for "is this finding excepted?". Every
 * place that turns a check result into a pass/fail must go through here so an
 * exception is honored consistently:
 *   - the Cloud Tests findings view (cloud-security-query.getFindings)
 *   - the task-check display (task-integrations getTaskCheckRuns)
 *   - the task-check run paths that set task status (manual run-check + the
 *     scheduled Trigger task)
 *
 * Centralizing the key format + the active filter here is deliberate: it's the
 * easy-to-get-wrong part, and duplicating it risks honoring an exception in one
 * surface but not another.
 */
export class ActiveExceptionSet {
  private readonly keys: Set<string>;
  /**
   * Excepted resourceIds grouped by `connectionId::checkId`. Lets a caller
   * count a run's excepted failures with a targeted query instead of loading
   * every result row into memory.
   */
  private readonly resourceIdsByConnCheck: Map<string, Set<string>>;
  /** Exception metadata per canonical key. Optional — evaluation-only callers
   *  build the set from bare keys and never ask for it. */
  private readonly infoByKey: ReadonlyMap<string, ActiveExceptionInfo>;

  constructor(
    keys: Iterable<string>,
    infoByKey?: ReadonlyMap<string, ActiveExceptionInfo>,
  ) {
    this.keys = new Set(keys);
    this.infoByKey = infoByKey ?? new Map();
    this.resourceIdsByConnCheck = new Map();
    for (const key of this.keys) {
      // key = `${connectionId}::${checkId}::${resourceId}`. A resourceId can
      // itself contain "::", so take the first two segments and rejoin the
      // rest — reconstructing exactly the resourceId used to build the key.
      const parts = key.split('::');
      if (parts.length < 3) continue;
      const groupKey = `${parts[0]}::${parts[1]}`;
      const resourceId = parts.slice(2).join('::');
      let ids = this.resourceIdsByConnCheck.get(groupKey);
      if (!ids) {
        ids = new Set();
        this.resourceIdsByConnCheck.set(groupKey, ids);
      }
      ids.add(resourceId);
    }
  }

  /** Canonical key. The only place this format is defined. */
  static key(
    connectionId: string,
    checkId: string,
    resourceId: string,
  ): string {
    return `${connectionId}::${checkId}::${resourceId}`;
  }

  get size(): number {
    return this.keys.size;
  }

  has(connectionId: string, checkId: string, resourceId: string): boolean {
    return this.keys.has(
      ActiveExceptionSet.key(connectionId, checkId, resourceId),
    );
  }

  /**
   * The excepted resourceIds for a (connection, check) pair. Empty when nothing
   * is excepted for that pair — callers use this to skip the count query
   * entirely (the common case: no exceptions).
   */
  exceptedResourceIds(connectionId: string, checkId: string): string[] {
    const ids = this.resourceIdsByConnCheck.get(
      `${connectionId}::${checkId}`,
    );
    return ids ? Array.from(ids) : [];
  }

  /**
   * Metadata (row id + reason) of the active exception covering this finding,
   * or null when none. Null also for sets built without metadata (bare keys) —
   * `has()` stays the authority on whether a finding is excepted.
   */
  infoFor(
    connectionId: string,
    checkId: string,
    resourceId: string,
  ): ActiveExceptionInfo | null {
    return (
      this.infoByKey.get(
        ActiveExceptionSet.key(connectionId, checkId, resourceId),
      ) ?? null
    );
  }
}

/**
 * Load active finding exceptions for an org as an {@link ActiveExceptionSet}.
 *
 * Fail-safe: on any DB error this returns an EMPTY set (suppress nothing) so a
 * lookup failure can never hide a real finding — we would rather show a finding
 * the customer excepted than silently pass a genuine one.
 */
export async function loadActiveExceptionSet(
  organizationId: string,
): Promise<ActiveExceptionSet> {
  try {
    const active = await db.findingException.findMany({
      where: {
        organizationId,
        revokedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      select: {
        id: true,
        connectionId: true,
        checkId: true,
        resourceId: true,
        reason: true,
      },
    });
    const infoByKey = new Map<string, ActiveExceptionInfo>();
    for (const e of active) {
      infoByKey.set(
        ActiveExceptionSet.key(e.connectionId, e.checkId, e.resourceId),
        { id: e.id, reason: e.reason },
      );
    }
    return new ActiveExceptionSet(infoByKey.keys(), infoByKey);
  } catch {
    return new ActiveExceptionSet([]);
  }
}
