import { db } from '@db';
import type { Prisma } from '@db';
import { conclusionSentence } from './internal-audit-defaults';
import type { AuditExportRow, AuditSignoffExportRow } from './types';

/**
 * Extra data the Internal Audit document (9.2) needs at export time but that
 * isn't on the audit rows: display names for finding owners (findings store a
 * plain memberId, no FK). Resolved once and frozen into the version snapshot
 * so a historical export re-renders byte-faithfully with the names that were
 * current at publish.
 */
export interface InternalAuditExtras {
  /** memberId → display name (name, else email, else a placeholder). */
  memberNames: Record<string, string>;
}

type Client = Prisma.TransactionClient | typeof db;

function memberDisplayName(
  user: { name: string | null; email: string | null } | null,
): string {
  return user?.name?.trim() || user?.email?.trim() || 'Unknown member';
}

/** Load the Internal Audit document's export extras for an organization. */
export async function loadInternalAuditExtras({
  organizationId,
  client,
}: {
  organizationId: string;
  client?: Client;
}): Promise<InternalAuditExtras> {
  const prisma = client ?? db;

  const members = await prisma.member.findMany({
    where: { organizationId },
    select: { id: true, user: { select: { name: true, email: true } } },
  });

  const memberNames: Record<string, string> = {};
  for (const member of members) {
    memberNames[member.id] = memberDisplayName(member.user);
  }

  return { memberNames };
}

/** The audit shape mapAudits consumes (EXPORT_DOCUMENT_INCLUDE's audits). */
export type AuditWithExportIncludes = Prisma.IsmsAuditGetPayload<{
  include: { controls: true; findings: true };
}>;

export const AUDIT_STATUS_LABELS: Record<string, string> = {
  planned: 'Planned',
  in_progress: 'In progress',
  complete: 'Complete',
};

export const CONTROL_RESULT_LABELS: Record<string, string> = {
  conformity_confirmed: 'Conformity confirmed',
  nonconformity_raised: 'Non-conformity raised',
  observation_raised: 'Observation raised',
  not_sampled: 'Not sampled this cycle',
};

export const FINDING_TYPE_LABELS: Record<string, string> = {
  nc_major: 'NC major',
  nc_minor: 'NC minor',
  ofi: 'OFI',
  observation: 'Observation',
};

export const FINDING_STATUS_LABELS: Record<string, string> = {
  open: 'Open',
  in_progress: 'In progress',
  closed: 'Closed',
};

function formatDateYmd(date: Date | null): string | null {
  return date ? date.toISOString().slice(0, 10) : null;
}

/** The three fixed sign-off slots, in the order the reference document uses. */
function mapSignoffs(audit: AuditWithExportIncludes): AuditSignoffExportRow[] {
  return [
    {
      role: 'Auditor',
      name: audit.signoffAuditorName ?? '',
      date: formatDateYmd(audit.signoffAuditorDate) ?? '',
    },
    {
      role: 'Information Security Manager / SPO',
      name: audit.signoffSpoName ?? '',
      date: formatDateYmd(audit.signoffSpoDate) ?? '',
    },
    {
      role: 'Top Management',
      name: audit.signoffTopMgmtName ?? '',
      date: formatDateYmd(audit.signoffTopMgmtDate) ?? '',
    },
  ];
}

/**
 * Map audit rows (with their controls and findings) into export rows,
 * resolving owner names and humanizing enum labels. All audits render — a
 * planned audit appears with its plan table and an empty report, which is the
 * honest state of the programme.
 */
export function mapAudits(
  audits: AuditWithExportIncludes[],
  extras: InternalAuditExtras,
): AuditExportRow[] {
  return audits.map((audit) => ({
    reference: audit.reference,
    scope: audit.scope,
    criteria: audit.criteria,
    auditorName: audit.auditorName ?? '',
    plannedStartDate: formatDateYmd(audit.plannedStartDate),
    plannedEndDate: formatDateYmd(audit.plannedEndDate),
    status: AUDIT_STATUS_LABELS[audit.status] ?? audit.status,
    conclusion: audit.conclusionVerdict
      ? conclusionSentence(audit.conclusionVerdict)
      : null,
    conclusionNotes: audit.conclusionNotes,
    controls: audit.controls.map((control) => ({
      controlRef: control.controlRef,
      whatWasTested: control.whatWasTested,
      whereToFind: control.whereToFind,
      result: control.result
        ? (CONTROL_RESULT_LABELS[control.result] ?? control.result)
        : '—',
      notes: control.notes ?? '',
    })),
    findings: audit.findings.map((finding) => ({
      reference: finding.reference,
      type: FINDING_TYPE_LABELS[finding.type] ?? finding.type,
      clauseOrControl: finding.clauseOrControl ?? '',
      description: finding.description,
      ownerName: finding.ownerMemberId
        ? (extras.memberNames[finding.ownerMemberId] ?? 'Former member')
        : '',
      dueDate: formatDateYmd(finding.dueDate) ?? '',
      status: FINDING_STATUS_LABELS[finding.status] ?? finding.status,
      closureEvidence: finding.closureEvidence ?? '',
    })),
    signoffs: mapSignoffs(audit),
  }));
}
