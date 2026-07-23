import type { IsmsExportSection } from '../utils/export-shared';
import type {
  DocumentExportInput,
  RiskTreatmentExportRow,
  VendorTreatmentExportRow,
} from './types';

/**
 * Clause-6.1.3 readiness check, shared by the submit-for-approval server gate
 * and the client Submit button (risk-treatment-constants.ts mirrors it). The
 * ticket requires an owner on every risk and every in-scope vendor risk before
 * the plan is generated/approved. Per-risk acceptance events are strongly
 * recommended but NOT blocking — rows without one render "Awaiting acceptance".
 * (Residual likelihood/impact always carry a value in the platform schema, so
 * the ticket's "residual set" requirement is inherently satisfied.)
 * Returns unmet requirements; empty = ready.
 */
export function riskTreatmentValidationMessages({
  riskCount,
  risksWithoutOwner,
  vendorsWithoutOwner,
}: {
  riskCount: number;
  risksWithoutOwner: number;
  vendorsWithoutOwner: number;
}): string[] {
  const messages: string[] = [];
  if (riskCount === 0) {
    messages.push('Record at least one risk in the Risk Register.');
  }
  if (risksWithoutOwner === 1) {
    messages.push('1 risk in the Risk Register needs an owner assigned.');
  } else if (risksWithoutOwner > 1) {
    messages.push(
      `${risksWithoutOwner} risks in the Risk Register need an owner assigned.`,
    );
  }
  if (vendorsWithoutOwner === 1) {
    messages.push('1 vendor needs an owner assigned.');
  } else if (vendorsWithoutOwner > 1) {
    messages.push(`${vendorsWithoutOwner} vendors need an owner assigned.`);
  }
  return messages;
}

function countByState(
  rows: Array<{ acceptanceState: string }>,
  state: string,
): number {
  return rows.filter((row) => row.acceptanceState === state).length;
}

/** "3 accepted, 1 awaiting acceptance, 1 stale" — acceptance summary for an intro. */
function acceptanceSummary(rows: Array<{ acceptanceState: string }>): string {
  const parts = [
    `${countByState(rows, 'accepted')} with owner acceptance recorded`,
    `${countByState(rows, 'awaiting')} awaiting acceptance`,
  ];
  const stale = countByState(rows, 'stale');
  if (stale > 0) {
    parts.push(`${stale} with a stale acceptance (re-acceptance required)`);
  }
  return parts.join(', ');
}

/** "10 open, 2 closed" — register status mix, keeping the tables at 9 columns. */
function statusSummary(rows: Array<{ status: string }>): string {
  const counts = new Map<string, number>();
  for (const row of rows) {
    counts.set(row.status, (counts.get(row.status) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([status, count]) => `${count} ${status.toLowerCase()}`)
    .join(', ');
}

function organisationalRisksIntro(risks: RiskTreatmentExportRow[]): string {
  const plural = risks.length === 1 ? 'risk is' : 'risks are';
  return `${risks.length} organisational ${plural} recorded in the Risk Register (${statusSummary(risks)}): ${acceptanceSummary(risks)}.`;
}

function supplierRisksIntro(vendors: VendorTreatmentExportRow[]): string {
  const plural = vendors.length === 1 ? 'supplier is' : 'suppliers are';
  return `${vendors.length} ${plural} recorded in the Vendors module (${statusSummary(vendors)}): ${acceptanceSummary(vendors)}.`;
}

/** Bullet lines for every row whose acceptance is outstanding (awaiting/stale). */
function outstandingBullets({
  risks,
  vendors,
}: {
  risks: RiskTreatmentExportRow[];
  vendors: VendorTreatmentExportRow[];
}): string[] {
  const bullets: string[] = [];
  for (const risk of risks) {
    if (risk.acceptanceState === 'awaiting') {
      bullets.push(
        `${risk.reference} (${risk.title}) — residual level ${risk.residualLevel}; owner acceptance not yet recorded. Owner: ${risk.ownerName}.`,
      );
    }
    if (risk.acceptanceState === 'stale') {
      bullets.push(
        `${risk.reference} (${risk.title}) — residual level changed since the last acceptance; previous acceptance marked stale. Owner (${risk.ownerName}) to record a fresh acceptance.`,
      );
    }
  }
  for (const vendor of vendors) {
    if (vendor.acceptanceState === 'awaiting') {
      bullets.push(
        `${vendor.name} (vendor) — residual level ${vendor.residualLevel}; owner acceptance not yet recorded. Owner: ${vendor.ownerName}.`,
      );
    }
    if (vendor.acceptanceState === 'stale') {
      bullets.push(
        `${vendor.name} (vendor) — residual level changed since the last acceptance; previous acceptance marked stale. Owner (${vendor.ownerName}) to record a fresh acceptance.`,
      );
    }
  }
  return bullets;
}

/**
 * Build the Risk Treatment Plan document (clause 6.1.3). Contents and order
 * follow the CS-727 reference document: Purpose, Reference (methodology
 * cross-reference + cell key), Organisational risks table, Supplier risks
 * table, Outstanding acceptances, Sign-off. The tables render from
 * input.riskTreatment (loaded live from the Risk Register + Vendors by
 * loadRiskTreatmentExtras); register status is summarized in each intro so the
 * tables keep the reference document's column set.
 */
export function buildRiskTreatmentPlanSections(
  input: DocumentExportInput,
): IsmsExportSection[] {
  const risks = input.riskTreatment?.risks ?? [];
  const vendors = input.riskTreatment?.vendors ?? [];
  const outstanding = outstandingBullets({ risks, vendors });

  return [
    {
      heading: 'Purpose',
      paragraphs: [
        {
          text: 'This document is the Risk Treatment Plan required by ISO/IEC 27001:2022, Clause 6.1.3. It records, for each identified risk, the selected treatment option, the controls and actions applied to implement it, the risk owner, and the residual risk state, with the risk-owner acceptance of residual risk where recorded (Clause 6.1.3(f)).',
        },
        {
          text: 'The plan is rendered from the Risk Register and the Vendors module in Comp AI and reflects the state of the register at the time of rendering. It is regenerated on demand; any material change to the register after this document was approved is flagged in Comp AI so the plan can be refreshed.',
        },
      ],
    },
    {
      heading: 'Reference',
      paragraphs: [
        {
          text: 'The scales, risk level matrix, treatment options, and acceptance thresholds used in this plan are defined in the Risk Assessment Methodology (Clause 6.1.2) document.',
        },
        {
          text: 'Cell key: Inherent = risk level before treatment; Residual = risk level after treatment. The Acceptance column shows the recorded owner acceptance with its date, "Awaiting acceptance" when none is recorded, or "Stale" when the residual level has changed since the last acceptance (re-acceptance required).',
        },
      ],
    },
    {
      heading: 'Organisational risks',
      intro: risks.length > 0 ? organisationalRisksIntro(risks) : undefined,
      emptyText: 'No risks recorded in the Risk Register.',
      table: {
        headers: [
          'Ref',
          'Description',
          'Category',
          'Inherent',
          'Treatment',
          'Controls / actions',
          'Owner',
          'Residual',
          'Acceptance',
        ],
        rows: risks.map((risk) => [
          risk.reference,
          risk.title,
          risk.category,
          risk.inherentLevel,
          risk.treatment,
          risk.controls,
          risk.ownerName,
          risk.residualLevel,
          risk.acceptance,
        ]),
      },
    },
    {
      heading: 'Supplier risks',
      intro: vendors.length > 0 ? supplierRisksIntro(vendors) : undefined,
      emptyText: 'No vendors recorded in the Vendors module.',
      table: {
        headers: [
          'Vendor',
          'Category',
          'Inherent',
          'Treatment',
          'Controls / actions',
          'Owner',
          'Residual',
          'Acceptance',
        ],
        rows: vendors.map((vendor) => [
          vendor.name,
          vendor.category,
          vendor.inherentLevel,
          vendor.treatment,
          vendor.controls,
          vendor.ownerName,
          vendor.residualLevel,
          vendor.acceptance,
        ]),
      },
    },
    {
      heading: 'Outstanding acceptances',
      ...(outstanding.length > 0
        ? {
            intro:
              'The following risks require attention before the next Management Review:',
            bullets: outstanding,
          }
        : {
            paragraphs: [
              {
                text: 'None — every recorded risk and supplier risk has a current owner acceptance.',
              },
            ],
          }),
    },
    {
      heading: 'Sign-off',
      paragraphs: [
        {
          text: 'This Risk Treatment Plan is approved by top management; the approver and approval date are recorded in the document control table above. Individual risk-owner acceptances of residual risk are recorded per row in the tables above — this sign-off is the overall approval of the plan required by Clause 6.1.3.',
        },
      ],
    },
  ];
}
