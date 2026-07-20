import type { IsmsDocumentType } from '@db';

/** ISO 27001 clause each foundational document type satisfies. */
export interface IsmsTypeDefinition {
  type: IsmsDocumentType;
  /** Clause number used to match the FrameworkEditorRequirement (e.g. "4.1"). */
  clause: string;
  title: string;
  /** Short summary of what the document covers (used as the template description). */
  description: string;
}

/**
 * The full set of ISMS foundational documents and the single source the
 * framework-editor template seed derives from (see packages/db .../seed.ts).
 * ensure-setup falls back to this list when no templates exist in the DB.
 * Several types share a clause (4.2 → register + requirements).
 */
export const ISMS_TYPE_DEFINITIONS: IsmsTypeDefinition[] = [
  {
    type: 'context_of_organization',
    clause: '4.1',
    title: 'Context of the Organization',
    description:
      'Internal and external issues relevant to the ISMS and their effect on its intended outcomes (ISO 27001 clause 4.1).',
  },
  {
    type: 'interested_parties_register',
    clause: '4.2',
    title: 'Interested Parties Register',
    description:
      'The interested parties relevant to the ISMS together with their needs and expectations (ISO 27001 clause 4.2).',
  },
  {
    type: 'interested_parties_requirements',
    clause: '4.2',
    title: 'Interested Parties Requirements',
    description:
      'The requirements of interested parties and how the ISMS addresses them (ISO 27001 clause 4.2).',
  },
  {
    type: 'isms_scope',
    clause: '4.3',
    title: 'ISMS Scope',
    description:
      'The boundaries and applicability of the ISMS, including the interfaces and dependencies considered (ISO 27001 clause 4.3).',
  },
  {
    type: 'leadership_commitment',
    clause: '5.1',
    title: 'Leadership and Commitment',
    description:
      'Evidence of top management leadership and commitment to the ISMS (ISO 27001 clause 5.1).',
  },
  {
    type: 'roles_and_responsibilities',
    clause: '5.3',
    title: 'Roles, Responsibilities and Authorities',
    description:
      'The ISMS governance roles, their responsibilities and authorities, and the members who hold them (ISO 27001 clause 5.3).',
  },
  {
    type: 'objectives_plan',
    clause: '6.2',
    title: 'Information Security Objectives and Plan',
    description:
      'Measurable information security objectives and the plan to achieve them (ISO 27001 clause 6.2).',
  },
  {
    type: 'monitoring',
    clause: '9.1',
    title: 'Monitoring, Measurement, Analysis and Evaluation',
    description:
      'The metrics the organization monitors — what is measured, how, when, by whom, and who analyses the results (ISO 27001 clause 9.1).',
  },
];

/**
 * Find the requirement whose name or identifier starts with the given clause
 * number. Matches "4.1", "4.1.1", "4.1 Understanding..." but not "14.1".
 */
export function matchRequirementId({
  clause,
  requirements,
}: {
  clause: string;
  requirements: Array<{ id: string; name: string; identifier: string }>;
}): string | null {
  const matches = (value: string | null | undefined): boolean => {
    if (!value) return false;
    const trimmed = value.trim();
    if (trimmed === clause) return true;
    // Must be followed by a separator so "4.1" does not match "4.11".
    return new RegExp(`^${clause.replace('.', '\\.')}(\\D|$)`).test(trimmed);
  };

  const found = requirements.find(
    (req) => matches(req.identifier) || matches(req.name),
  );
  return found?.id ?? null;
}
