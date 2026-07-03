import { Injectable, NotFoundException } from '@nestjs/common';
import { db } from '@db';
import { TASK_TEMPLATES } from '@trycompai/integration-platform';
import {
  CheckResultsService,
  type CheckResultRow,
} from '../integration-platform/services/check-results.service';

/** One integration's access information for a single member. */
export interface MemberAccessSource {
  slug: string;
  name: string;
  logoUrl: string | null;
  /**
   * matched      — access entries for this member were found
   * not-matched  — the source has data, but none of it matches this member's
   *                email (e.g. the check keys users by provider login)
   * no-data      — the source's access check has never really run
   */
  matchType: 'matched' | 'not-matched' | 'no-data';
  entries: MemberAccessEntry[];
  lastCheckedAt: string | null;
}

/** A single access record, normalized just enough to render. */
export interface MemberAccessEntry {
  /** Best-effort one-line summary (role, title, …). */
  summary: string;
  /** Curated well-known fields, present when the check provides them. */
  fields: Record<string, string>;
  /** The untouched source record, for the expandable details view. */
  raw: unknown;
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const asString = (v: unknown): string | undefined =>
  typeof v === 'string' && v.trim() ? v : undefined;

/** Field names checks commonly use for a person's email. */
const EMAIL_KEYS = ['email', 'primaryEmail', 'userEmail', 'mail', 'emailAddress'];
/** Evidence keys that commonly hold per-person rosters. */
const ROSTER_KEYS = ['employees', 'users', 'members', 'accounts', 'people'];
/** Well-known access fields worth promoting into the curated view. */
const PROMOTED_FIELDS: Array<{ key: string; label: string }> = [
  { key: 'role', label: 'Role' },
  { key: 'roles', label: 'Roles' },
  { key: 'isAdmin', label: 'Admin' },
  { key: 'isDelegatedAdmin', label: 'Delegated admin' },
  { key: 'status', label: 'Status' },
  { key: 'suspended', label: 'Suspended' },
  { key: 'orgUnit', label: 'Org unit' },
  { key: 'lastLoginTime', label: 'Last login' },
  { key: 'lastLogin', label: 'Last login' },
  { key: 'permissions', label: 'Permissions' },
];

function recordEmail(record: Record<string, unknown>): string | undefined {
  for (const key of EMAIL_KEYS) {
    const value = asString(record[key]);
    if (value) return value.toLowerCase().trim();
  }
  return undefined;
}

function toEntry(record: Record<string, unknown>, fallbackSummary: string): MemberAccessEntry {
  const fields: Record<string, string> = {};
  for (const { key, label } of PROMOTED_FIELDS) {
    const value = record[key];
    if (value === undefined || value === null || fields[label]) continue;
    fields[label] = Array.isArray(value) ? value.map(String).join(', ') : String(value);
  }
  const summary =
    asString(record['role']) ??
    (Array.isArray(record['roles']) ? record['roles'].map(String).join(', ') : undefined) ??
    fallbackSummary;
  return { summary, fields, raw: record };
}

/**
 * Extract a member's access entries from one integration's check results.
 * Tolerates the two shapes checks use in the wild:
 *  A) one result row per user (resourceId = email)
 *  B) one org-level row whose evidence embeds a roster array
 * Exported for direct unit testing.
 */
export function extractMemberEntries(
  results: CheckResultRow[],
  memberEmail: string,
): MemberAccessEntry[] {
  const entries: MemberAccessEntry[] = [];

  for (const row of results) {
    // Shape A: per-user rows keyed by email.
    if (row.resourceId.toLowerCase().trim() === memberEmail) {
      const evidence = isRecord(row.evidence) ? row.evidence : {};
      entries.push(toEntry({ ...evidence }, row.title || row.description || 'Access record'));
      continue;
    }

    // Shape B: roster arrays inside the evidence payload.
    if (!isRecord(row.evidence)) continue;
    for (const rosterKey of ROSTER_KEYS) {
      const roster = row.evidence[rosterKey];
      if (!Array.isArray(roster)) continue;
      for (const item of roster) {
        if (isRecord(item) && recordEmail(item) === memberEmail) {
          entries.push(toEntry(item, row.title || 'Access record'));
        }
      }
    }
  }

  return entries;
}

/**
 * Aggregates a member's access across every connected integration whose check
 * is bound to the Employee Access evidence task. Read-only; consumer #2 of the
 * universal CheckResultsService (interpretation happens here, per its design).
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
          const entries = memberEmail ? extractMemberEntries(results, memberEmail) : [];
          const lastCheckedAt = results.length
            ? new Date(
                Math.max(...results.map((r) => new Date(r.collectedAt).getTime())),
              ).toISOString()
            : null;
          return {
            slug: s.slug,
            name: s.name,
            logoUrl: s.logoUrl,
            matchType:
              results.length === 0 ? 'no-data' : entries.length > 0 ? 'matched' : 'not-matched',
            entries,
            lastCheckedAt,
          } satisfies MemberAccessSource;
        }),
    );

    return { memberId, sources: access };
  }
}
