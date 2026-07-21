import { z } from 'zod';
import type { Prisma } from '@db';
import type { IsmsExportSection } from '../utils/export-shared';
import type {
  AuditExportRow,
  DocumentExportInput,
  IsmsPlatformData,
} from './types';
import {
  defaultProgrammeText,
  SEED_AUDIT_CONTROL_DEFINITIONS,
} from './internal-audit-defaults';

type Tx = Prisma.TransactionClient;

/**
 * Narrative shape persisted on the Internal Audit document (clause 9.2): the
 * Programme paragraph shown at the top of the page and rendered verbatim into
 * the generated document. The audits themselves live in their own registers.
 */
export const internalAuditNarrativeSchema = z.object({
  programme: z.string().trim().min(1),
});

export type InternalAuditNarrative = z.infer<
  typeof internalAuditNarrativeSchema
>;

/** Derive the default Programme paragraph (hardcoded default, editable). */
export function deriveInternalAuditNarrative(
  data: IsmsPlatformData,
): InternalAuditNarrative {
  return { programme: defaultProgrammeText(data.organizationName) };
}

/**
 * Clause-9.2 completeness check, shared by the submit-for-approval server gate
 * and the client Submit button (internal-audit-constants.ts mirrors it).
 * Requires at least one audit instance (an ISMS with no internal audit is the
 * Stage-2 blocker this feature exists to remove) and a conclusion verdict on
 * every completed audit (the document would otherwise render a conclusion with
 * an unselected bracket). Returns unmet requirements; empty = ready.
 */
export function auditValidationMessages({
  audits,
}: {
  audits: Array<{
    reference: string;
    status: string;
    conclusionVerdict: string | null;
  }>;
}): string[] {
  if (audits.length === 0) {
    return ['At least one internal audit must be recorded.'];
  }
  return audits
    .filter((audit) => audit.status === 'complete' && !audit.conclusionVerdict)
    .map(
      (audit) =>
        `Audit ${audit.reference} is complete but has no conclusion verdict.`,
    );
}

/**
 * Seed the fifteen default Controls Tested rows for an audit, idempotently by
 * `controlKey`. Only creates seed rows that are missing — it NEVER deletes or
 * overwrites, so re-running can never clobber the customer's edits, results,
 * or notes (same guarantee as seedMetricsIfMissing). Called when an audit
 * instance is created.
 */
export async function seedAuditControlsIfMissing({
  tx,
  auditId,
  documentId,
}: {
  tx: Tx;
  auditId: string;
  documentId: string;
}): Promise<void> {
  const existing = await tx.ismsAuditControl.findMany({
    where: { auditId },
    select: { controlKey: true, position: true },
  });
  const existingKeys = new Set(
    existing
      .map((control) => control.controlKey)
      .filter((key): key is string => !!key),
  );
  const missing = SEED_AUDIT_CONTROL_DEFINITIONS.filter(
    (control) => !existingKeys.has(control.controlKey),
  );
  if (missing.length === 0) return;

  const maxPosition = existing.reduce(
    (max, control) => Math.max(max, control.position),
    -1,
  );

  await tx.ismsAuditControl.createMany({
    data: missing.map((control, index) => ({
      auditId,
      documentId,
      controlKey: control.controlKey,
      controlRef: control.controlRef,
      whatWasTested: control.whatWasTested,
      whereToFind: control.whereToFind,
      source: 'derived' as const,
      derivedFrom: `seed:${control.controlKey}`,
      position: maxPosition + 1 + index,
    })),
    // Belt-and-braces with @@unique([auditId, controlKey]): a concurrent
    // create racing this seed is absorbed silently.
    skipDuplicates: true,
  });
}

// ---- Export section builder -------------------------------------------------

function parseProgramme(narrative: unknown): string | null {
  const parsed = internalAuditNarrativeSchema.safeParse(narrative);
  return parsed.success ? parsed.data.programme : null;
}

/** Per-audit sections: plan table, Controls Tested, Findings, Conclusion, Sign-off. */
function buildAuditSections(
  audit: AuditExportRow,
  suffix: string,
): IsmsExportSection[] {
  const sections: IsmsExportSection[] = [
    {
      heading: `Audit plan${suffix}`,
      keyValues: [
        { label: 'Reference', value: audit.reference },
        { label: 'Scope', value: audit.scope },
        { label: 'Criteria', value: audit.criteria },
        { label: 'Auditor', value: audit.auditorName || '—' },
        { label: 'Planned start date', value: audit.plannedStartDate ?? '—' },
        { label: 'Planned end date', value: audit.plannedEndDate ?? '—' },
        { label: 'Status', value: audit.status },
      ],
    },
  ];

  // The renderers show emptyText only when a section has no other content, so
  // the intro is included only when there are rows to introduce.
  if (audit.controls.length > 0) {
    sections.push({
      heading: `Controls Tested${suffix}`,
      intro:
        'Each control below was sampled by the auditor. The "Where to find it" column names the location the auditor referenced. The "Result" column records the auditor\'s finding for each control. Rows marked "Not sampled this cycle" were deliberately scoped out of this audit.',
      table: {
        headers: [
          'Control reference',
          'What was tested',
          'Where to find it',
          'Result',
          'Notes',
        ],
        rows: audit.controls.map((control) => [
          control.controlRef,
          control.whatWasTested,
          control.whereToFind,
          control.result,
          control.notes,
        ]),
      },
    });
  } else {
    sections.push({
      heading: `Controls Tested${suffix}`,
      emptyText: 'No controls recorded for this audit.',
    });
  }

  if (audit.findings.length > 0) {
    sections.push({
      heading: `Findings${suffix}`,
      intro:
        'Non-conformities, opportunities for improvement (OFIs), and observations raised during this audit. Each is tracked to closure in Comp AI.',
      table: {
        headers: [
          'Ref',
          'Type',
          'Clause / control',
          'Description',
          'Owner',
          'Due date',
          'Status',
        ],
        rows: audit.findings.map((finding) => [
          finding.reference,
          finding.type,
          finding.clauseOrControl,
          // Closure evidence rides in the description cell so the exported
          // record shows how a corrective action was evidenced without
          // widening the reference document's seven-column table.
          finding.closureEvidence
            ? `${finding.description} — Closure evidence: ${finding.closureEvidence}`
            : finding.description,
          finding.ownerName,
          finding.dueDate,
          finding.status,
        ]),
      },
    });
  } else {
    sections.push({
      heading: `Findings${suffix}`,
      emptyText: 'No findings raised.',
    });
  }

  sections.push(
    audit.conclusion
      ? {
          heading: `Conclusion${suffix}`,
          paragraphs: [
            { text: audit.conclusion },
            ...(audit.conclusionNotes ? [{ text: audit.conclusionNotes }] : []),
          ],
        }
      : {
          heading: `Conclusion${suffix}`,
          emptyText: 'No conclusion recorded yet.',
        },
    {
      heading: `Sign-off${suffix}`,
      table: {
        headers: ['Role', 'Signatory', 'Date'],
        rows: audit.signoffs.map((signoff) => [
          signoff.role,
          signoff.name || '—',
          signoff.date || '—',
        ]),
      },
    },
  );

  return sections;
}

/**
 * Build the Internal Audit Programme, Plan and Report document (clause 9.2).
 * Contents and order follow the CS-724 ticket and reference document: Purpose,
 * Programme, then per audit its plan, Controls Tested, Findings, Conclusion,
 * and Sign-off. `audits` (names and labels already resolved) is populated by
 * loadInternalAuditExtras at export-input assembly (see
 * internal-audit-export-data.ts). With a single audit the headings match the
 * reference document verbatim; with several, each block carries its reference.
 */
export function buildInternalAuditSections(
  input: DocumentExportInput,
): IsmsExportSection[] {
  const audits = input.audits ?? [];
  const programme = parseProgramme(input.narrative);

  const sections: IsmsExportSection[] = [
    {
      heading: 'Purpose',
      paragraphs: [
        {
          text: 'This document records the internal audit programme and the results of the internal audits of the Information Security Management System, in accordance with ISO/IEC 27001:2022, Clause 9.2. It is retained as documented information and made available to the certification body on request.',
        },
      ],
    },
    programme
      ? { heading: 'Programme', paragraphs: [{ text: programme }] }
      : { heading: 'Programme', emptyText: 'No audit programme recorded.' },
  ];

  if (audits.length === 0) {
    sections.push({
      heading: 'Audits',
      emptyText: 'No internal audits recorded yet.',
    });
    return sections;
  }

  for (const audit of audits) {
    const suffix = audits.length > 1 ? ` — ${audit.reference}` : '';
    sections.push(...buildAuditSections(audit, suffix));
  }

  return sections;
}
