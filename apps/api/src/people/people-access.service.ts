import { Injectable, NotFoundException } from '@nestjs/common';
import { db } from '@db';
import { TASK_TEMPLATES } from '@trycompai/integration-platform';
import { CheckResultsService } from '../integration-platform/services/check-results.service';
import {
  EvidenceExtractionService,
  type PersonEvidenceEntry,
  type PersonEvidenceExtraction,
} from '../integration-platform/services/evidence-extraction.service';

/** One integration's access information for a single member. */
export interface MemberAccessSource {
  slug: string;
  name: string;
  logoUrl: string | null;
  /**
   * matched      — access entries for this member were found
   * not-matched  — the source has data, but this member provably isn't in it
   * unparsed     — the member appears in the data, but neither the
   *                deterministic extractor nor the AI fallback could read it
   * no-data      — the source's access check has never really run
   */
  matchType: 'matched' | 'not-matched' | 'unparsed' | 'no-data';
  entries: PersonEvidenceEntry[];
  lastCheckedAt: string | null;
}

/** What the extraction should surface — passed to the AI fallback as context. */
const ACCESS_PURPOSE =
  "this employee's access in the tool: roles, permissions, admin status, account status";

const NOT_FOUND: PersonEvidenceExtraction = { status: 'not-found', entries: [] };

/**
 * Aggregates a member's access across every connected integration whose check
 * is bound to the Employee Access evidence task. Read-only; consumer #2 of the
 * universal CheckResultsService. Person-in-evidence matching is delegated to
 * the shared EvidenceExtractionService (deterministic first, Haiku fallback
 * for unknown shapes) — interpretation of WHAT the entries mean stays here.
 */
@Injectable()
export class PeopleAccessService {
  constructor(
    private readonly checkResults: CheckResultsService,
    private readonly evidenceExtraction: EvidenceExtractionService,
  ) {}

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
          const extraction = memberEmail
            ? await this.evidenceExtraction.extractPersonEntries({
                results,
                email: memberEmail,
                purpose: ACCESS_PURPOSE,
              })
            : NOT_FOUND;
          const lastCheckedAt = results.length
            ? new Date(
                Math.max(...results.map((r) => new Date(r.collectedAt).getTime())),
              ).toISOString()
            : null;
          const matchType: MemberAccessSource['matchType'] =
            results.length === 0
              ? 'no-data'
              : extraction.status === 'found'
                ? 'matched'
                : extraction.status === 'unparsed'
                  ? 'unparsed'
                  : 'not-matched';
          return {
            slug: s.slug,
            name: s.name,
            logoUrl: s.logoUrl,
            matchType,
            entries: extraction.entries,
            lastCheckedAt,
          } satisfies MemberAccessSource;
        }),
    );

    return { memberId, sources: access };
  }
}
