import { Injectable, NotFoundException } from '@nestjs/common';
import { db } from '@db';
import { TASK_TEMPLATES } from '@trycompai/integration-platform';
import {
  CheckResultsService,
  type CheckResultRow,
} from '../integration-platform/services/check-results.service';

/** One access record for the member from one integration's check results. */
export interface MemberAccessEntry {
  /** Stable unique id (run id + row position) — safe as a React key. */
  id: string;
  summary: string;
  /** Human-readable label -> value pairs pulled from the row's evidence. */
  fields: Record<string, string>;
  /** The raw result evidence, for auditors. */
  raw: unknown;
}

/** One integration's access information for a single member. */
export interface MemberAccessSource {
  slug: string;
  name: string;
  logoUrl: string | null;
  /**
   * matched         — per-user rows for this member's email were found
   * not-matched     — the source reports per-user rows, but none for this member
   * no-person-data  — the source's check ran but emits no per-user rows (its
   *                   vendor API has no roster, or the check isn't normalized)
   * no-data         — the source's access check has never really run
   */
  matchType: 'matched' | 'not-matched' | 'no-person-data' | 'no-data';
  entries: MemberAccessEntry[];
  lastCheckedAt: string | null;
}

/** Evidence keys that duplicate row-level info or are noise in a field list. */
const HIDDEN_EVIDENCE_KEYS = new Set(['checkedAt', 'fetchedAt', 'reviewedAt', 'raw']);
const MAX_FIELDS = 12;

/** camelCase / snake_case -> "Title Case" label. */
function labelize(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/([a-z\d])([A-Z])/g, '$1 $2')
    .replace(/^./, (c) => c.toUpperCase());
}

/**
 * Flatten a result row into a display entry. Only primitive evidence values
 * become fields — nested objects/arrays stay visible in `raw`.
 */
function toEntry(row: CheckResultRow, index: number): MemberAccessEntry {
  const fields: Record<string, string> = {};
  if (row.evidence && typeof row.evidence === 'object' && !Array.isArray(row.evidence)) {
    for (const [key, value] of Object.entries(row.evidence)) {
      if (Object.keys(fields).length >= MAX_FIELDS) break;
      if (HIDDEN_EVIDENCE_KEYS.has(key) || value == null) continue;
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        fields[labelize(key)] = String(value);
      }
    }
  }
  return {
    id: `${row.runId}:${index}`,
    summary: row.description ?? row.title,
    fields,
    raw: row.evidence,
  };
}

/**
 * Aggregates a member's access across every connected integration whose check
 * is bound to the Employee Access evidence task. Read-only consumer of the
 * universal CheckResultsService.
 *
 * Matching is purely deterministic: person-scoped checks emit one row per
 * person with resourceType 'user' and resourceId = lowercased email (see the
 * check-results-service skill), so a member's access is exactly the rows whose
 * resourceId equals their email. No evidence parsing, no AI.
 */
@Injectable()
export class PeopleAccessService {
  constructor(private readonly checkResults: CheckResultsService) {}

  async getMemberAccess(organizationId: string, memberId: string) {
    const member = await db.member.findFirst({
      where: { id: memberId, organizationId },
      select: { id: true, user: { select: { email: true } } },
    });
    if (!member) throw new NotFoundException('Member not found');
    const memberEmail = (member.user.email ?? '').toLowerCase().trim();

    const sources = await this.checkResults.listSourcesBoundToTask(
      organizationId,
      TASK_TEMPLATES.employeeAccess,
    );

    const access: MemberAccessSource[] = await Promise.all(
      sources
        .filter((s) => s.connected && s.connectionId)
        .map(async (s) => {
          const results = await this.checkResults.getLatestResultsByCheck({
            organizationId,
            connectionId: s.connectionId as string,
            checkId: s.checkId,
          });
          const userRows = results.filter((r) => r.resourceType === 'user');
          const memberRows = memberEmail
            ? userRows.filter((r) => r.resourceId.toLowerCase().trim() === memberEmail)
            : [];
          const lastCheckedAt = results.length
            ? new Date(
                Math.max(...results.map((r) => new Date(r.collectedAt).getTime())),
              ).toISOString()
            : null;
          const matchType: MemberAccessSource['matchType'] =
            results.length === 0
              ? 'no-data'
              : memberRows.length > 0
                ? 'matched'
                : userRows.length > 0
                  ? 'not-matched'
                  : 'no-person-data';
          return {
            slug: s.slug,
            name: s.name,
            logoUrl: s.logoUrl,
            matchType,
            entries: memberRows.map(toEntry),
            lastCheckedAt,
          } satisfies MemberAccessSource;
        }),
    );

    return { memberId, sources: access };
  }
}
