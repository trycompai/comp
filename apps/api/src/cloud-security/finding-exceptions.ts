import { db } from '@db';

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

  constructor(keys: Iterable<string>) {
    this.keys = new Set(keys);
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
      select: { connectionId: true, checkId: true, resourceId: true },
    });
    return new ActiveExceptionSet(
      active.map((e) =>
        ActiveExceptionSet.key(e.connectionId, e.checkId, e.resourceId),
      ),
    );
  } catch {
    return new ActiveExceptionSet([]);
  }
}
