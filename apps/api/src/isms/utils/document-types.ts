import type { IsmsDocumentType } from '@db';

/** ISO 27001 clause each foundational document type satisfies. */
export interface IsmsTypeDefinition {
  type: IsmsDocumentType;
  /** Clause number used to match the FrameworkEditorRequirement (e.g. "4.1"). */
  clause: string;
  title: string;
}

/**
 * The full set of ISMS foundational documents. ensure-setup creates one row per
 * entry. Several types share a clause (4.2 → register + requirements).
 */
export const ISMS_TYPE_DEFINITIONS: IsmsTypeDefinition[] = [
  {
    type: 'context_of_organization',
    clause: '4.1',
    title: 'Context of the Organization',
  },
  {
    type: 'interested_parties_register',
    clause: '4.2',
    title: 'Interested Parties Register',
  },
  {
    type: 'interested_parties_requirements',
    clause: '4.2',
    title: 'Interested Parties Requirements',
  },
  {
    type: 'isms_scope',
    clause: '4.3',
    title: 'ISMS Scope',
  },
  {
    type: 'leadership_commitment',
    clause: '5.1',
    title: 'Leadership and Commitment',
  },
  {
    type: 'objectives_plan',
    clause: '6.2',
    title: 'Information Security Objectives and Plan',
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
