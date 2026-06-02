import {
  deriveContextIssues,
  EXTERNAL_ISSUE_CATEGORIES,
  INTERNAL_ISSUE_CATEGORIES,
  type ContextDerivationInput,
} from '../utils/context-derivation';
import type { IsmsExportSection } from '../utils/export-shared';
import type { DocumentExportInput, IsmsPlatformData } from './types';

/** Adapt the shared platform data to the 4.1 derivation input. */
function toContextInput(data: IsmsPlatformData): ContextDerivationInput {
  return {
    frameworkNames: data.frameworkNames,
    vendorCount: data.vendorCount,
    subProcessorCount: data.subProcessorCount,
    vendorsByCategory: data.vendorsByCategory,
    memberCount: data.memberCount,
    membersByDepartment: data.membersByDepartment,
    deviceCount: data.deviceCount,
  };
}

/** Re-export the 4.1 derivation under the per-document module. */
export function deriveContextOfOrganization(data: IsmsPlatformData) {
  return deriveContextIssues(toContextInput(data));
}

const STANDARD = 'ISO/IEC 27001:2022';

type ContextIssue = DocumentExportInput['contextIssues'][number];

function orgNameFrom(input: DocumentExportInput): string {
  const entry = input.orgProfile?.overview.find(
    (row) => row.label === 'Legal entity',
  );
  return entry?.value || 'the organization';
}

function purposeSection(orgName: string): IsmsExportSection {
  return {
    heading: '1. Purpose',
    paragraphs: [
      {
        text: `This document determines the external and internal issues relevant to the purpose of ${orgName} that affect its ability to achieve the intended outcomes of its Information Security Management System (ISMS), in accordance with ${STANDARD}, Clause 4.1.`,
      },
      {
        text: "For each issue, the effect on the organization's ability to achieve the objectives of its ISMS is stated explicitly. The document is reviewed at least annually and whenever a material change occurs (strategy, technology stack, regulatory environment, key personnel, or significant incidents).",
      },
    ],
  };
}

function overviewSection(input: DocumentExportInput): IsmsExportSection {
  return {
    heading: '2. Organization overview',
    keyValues: input.orgProfile?.overview ?? [],
    emptyText: 'Organization details have not been captured yet.',
  };
}

function missionSection(input: DocumentExportInput): IsmsExportSection {
  const profile = input.orgProfile;
  const mission = profile?.mission ?? null;
  const intendedOutcomes = profile?.intendedOutcomes ?? [];

  const paragraphs: IsmsExportSection['paragraphs'] = [];
  if (mission) {
    paragraphs.push({ text: '3.1 Mission', bold: true });
    paragraphs.push({ text: mission });
  }
  if (intendedOutcomes.length > 0) {
    paragraphs.push({ text: '3.2 Intended outcomes of the ISMS', bold: true });
  }

  return {
    heading: '3. Mission and intended outcomes of the ISMS',
    paragraphs,
    bullets: intendedOutcomes.length > 0 ? intendedOutcomes : undefined,
    emptyText: 'No mission or intended outcomes recorded.',
  };
}

function issuesSection({
  heading,
  intro,
  issueColumnLabel,
  categories,
  issues,
}: {
  heading: string;
  intro: string;
  issueColumnLabel: string;
  categories: readonly string[];
  issues: ContextIssue[];
}): IsmsExportSection {
  const order = new Map(categories.map((category, index) => [category, index]));
  const sorted = [...issues].sort(
    (a, b) =>
      (order.get(a.category ?? '') ?? categories.length) -
      (order.get(b.category ?? '') ?? categories.length),
  );

  return {
    heading,
    intro,
    emptyText: 'No issues recorded.',
    table: {
      headers: [
        'Category',
        issueColumnLabel,
        'Effect on the ability to achieve ISMS objectives',
      ],
      rows: sorted.map((issue) => [
        issue.category ?? '—',
        issue.description,
        issue.effect,
      ]),
    },
  };
}

function linkageSection(): IsmsExportSection {
  return {
    heading: '6. Linkage to the ISMS',
    intro: 'The issues above feed directly into:',
    bullets: [
      'Clause 4.2 — Interested parties and their requirements.',
      'Clause 4.3 — ISMS scope, including interfaces and dependencies with cloud providers and other sub-processors.',
      'Clause 5 — Leadership, policy, and roles & responsibilities.',
      'Clause 6.1 — Information security risk assessment and risk treatment.',
      'Clause 9.3 — Management review inputs (changes to external and internal issues).',
    ],
  };
}

function reviewSection(): IsmsExportSection {
  return {
    heading: '7. Review',
    paragraphs: [
      {
        text: 'Owner: the Security & Privacy Owner. The document is reviewed at least annually and on material change. Outputs feed the Management Review per Clause 9.3.',
      },
    ],
  };
}

/**
 * Build the Context of the Organization (clause 4.1) export as the full
 * auditor-ready document: purpose, organization overview, mission & intended
 * outcomes, the categorised external/internal issue tables (each with the
 * "effect on ISMS objectives" column), linkage to the ISMS, and review.
 */
export function buildContextSections(
  input: DocumentExportInput,
): IsmsExportSection[] {
  const external = input.contextIssues.filter((i) => i.kind === 'external');
  const internal = input.contextIssues.filter((i) => i.kind === 'internal');

  return [
    purposeSection(orgNameFrom(input)),
    overviewSection(input),
    missionSection(input),
    issuesSection({
      heading: '4. External issues (4.1)',
      intro:
        'External issues are organised under the categories of regulatory & legal, market & economic, technological, and social & cultural. For each, the effect on the ability to achieve the ISMS objectives is stated.',
      issueColumnLabel: 'External issue',
      categories: EXTERNAL_ISSUE_CATEGORIES,
      issues: external,
    }),
    issuesSection({
      heading: '5. Internal issues (4.1)',
      intro:
        'Internal issues are organised under the categories of governance & structure, strategy & objectives, capabilities & resources, and culture & values.',
      issueColumnLabel: 'Internal issue',
      categories: INTERNAL_ISSUE_CATEGORIES,
      issues: internal,
    }),
    linkageSection(),
    reviewSection(),
  ];
}
