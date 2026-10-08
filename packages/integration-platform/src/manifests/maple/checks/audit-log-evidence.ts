import type { CheckContext, IntegrationCheck } from '../../../types';
import { failMapleRequest, listAll, requireMapleBaseUrl } from '../api';
import type { MapleAuditLogEntry } from '../types';
import { auditWindowDaysVariable, parseAuditWindowDays } from '../variables';

const TOP_N = 20;
/** Newest entries sampled for the activity summary; denied entries are always fetched in full */
const SAMPLE_PAGES = 10;

/**
 * Maple Audit Log Evidence Check
 *
 * Collects the Maple audit log for the configured window as evidence of who
 * changed monitoring configuration, and surfaces denied actions.
 */
export const auditLogEvidenceCheck: IntegrationCheck = {
  id: 'audit-log-evidence',
  name: 'Audit Log Is Recorded',
  description:
    'Collect Maple audit log activity as evidence of configuration changes and denied actions',
  service: 'access',
  defaultSeverity: 'low',
  variables: [auditWindowDaysVariable],

  run: async (ctx: CheckContext) => {
    const baseUrl = requireMapleBaseUrl(ctx);
    if (!baseUrl) return;

    const windowDays = parseAuditWindowDays(ctx.variables);
    const since = new Date(Date.now() - windowDays * 86_400_000);

    ctx.log(`Fetching Maple audit log since ${since.toISOString()}`);
    let entries: MapleAuditLogEntry[];
    let denied: MapleAuditLogEntry[];
    try {
      [entries, denied] = await Promise.all([
        listAll<MapleAuditLogEntry>(ctx, {
          baseUrl,
          path: '/v2/audit_log',
          params: { since: since.toISOString() },
          maxPages: SAMPLE_PAGES,
        }),
        listAll<MapleAuditLogEntry>(ctx, {
          baseUrl,
          path: '/v2/audit_log',
          params: { since: since.toISOString(), outcome: 'denied' },
        }),
      ]);
    } catch (error) {
      failMapleRequest(ctx, { error, resource: 'audit log', scope: 'audit_log:read' });
      return;
    }

    // A full sample page set means older entries in the window were not read.
    const truncated = entries.length >= SAMPLE_PAGES * 100;
    ctx.log(
      `Sampled ${entries.length} entries${truncated ? ' (truncated)' : ''}, ${denied.length} denied`,
    );

    if (denied.length > 0) {
      ctx.fail({
        title: `${denied.length} denied actions in Maple`,
        resourceType: 'maple',
        resourceId: 'audit-log-denied',
        severity: 'low',
        description: `Maple refused ${denied.length} actions in the last ${windowDays} days. Review them for misconfigured automation or access attempts beyond a user's role.`,
        remediation:
          'In Maple, open Settings → Audit Log, filter by outcome "denied", and confirm each actor should not have that access.',
        evidence: {
          denied: denied.slice(0, TOP_N).map((entry) => ({
            id: entry.id,
            occurredAt: entry.occurred_at,
            action: entry.action,
            actor: entry.actor_name ?? entry.actor_id,
            actorType: entry.actor_type,
            reason: entry.denial_reason,
            originIp: entry.origin_ip,
          })),
        },
      });
    }

    ctx.pass({
      title: 'Maple audit log is recorded',
      resourceType: 'maple',
      resourceId: 'audit-log',
      description: truncated
        ? `More than ${entries.length} audit log entries in the last ${windowDays} days; the newest ${entries.length} are summarized.`
        : `${entries.length} audit log entries in the last ${windowDays} days.`,
      evidence: {
        since: since.toISOString(),
        sampledEntries: entries.length,
        truncated,
        deniedEntries: denied.length,
        byAction: countBy(entries, (entry) => entry.action),
        byActor: countBy(
          entries,
          (entry) => entry.actor_name ?? entry.actor_id ?? entry.actor_type,
        ),
        latest: entries.slice(0, TOP_N).map((entry) => ({
          occurredAt: entry.occurred_at,
          action: entry.action,
          outcome: entry.outcome,
          actor: entry.actor_name ?? entry.actor_id,
          resource: entry.resource_id ?? entry.resource_type,
        })),
      },
    });
  },
};

function countBy<T>(items: T[], key: (item: T) => string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const item of items) {
    const k = key(item);
    counts[k] = (counts[k] ?? 0) + 1;
  }
  return Object.fromEntries(
    Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, TOP_N),
  );
}
