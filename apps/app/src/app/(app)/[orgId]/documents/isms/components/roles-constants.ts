import type {
  IsmsAuditRoute,
  IsmsCompetenceBasis,
  IsmsRole,
} from '../isms-types';

/** Team-size band derived from active headcount (matches the API: 1-3 = small). */
export type IsmsTeamSizeBand = 'small' | 'standard';

export function teamSizeBand(memberCount: number): IsmsTeamSizeBand {
  return memberCount <= 3 ? 'small' : 'standard';
}

export const COMPETENCE_BASIS_OPTIONS: {
  value: IsmsCompetenceBasis;
  label: string;
}[] = [
  { value: 'education', label: 'Education' },
  { value: 'training', label: 'Training' },
  { value: 'experience', label: 'Experience' },
  { value: 'combination', label: 'Combination' },
];

export const COMPETENCE_BASIS_LABELS: Record<IsmsCompetenceBasis, string> =
  Object.fromEntries(
    COMPETENCE_BASIS_OPTIONS.map((option) => [option.value, option.label]),
  ) as Record<IsmsCompetenceBasis, string>;

export const AUDIT_ROUTE_OPTIONS: { value: IsmsAuditRoute; label: string }[] = [
  { value: 'in_house', label: 'In-house person with audit competence' },
  { value: 'external', label: 'External independent auditor engaged' },
  { value: 'training_planned', label: 'Training planned' },
];

export const AUDIT_ROUTE_LABELS: Record<IsmsAuditRoute, string> =
  Object.fromEntries(
    AUDIT_ROUTE_OPTIONS.map((option) => [option.value, option.label]),
  ) as Record<IsmsAuditRoute, string>;

export const INTERNAL_AUDITOR_ROLE_KEY = 'internal_auditor';
export const SPO_ROLE_KEY = 'spo';
export const DEPUTY_SPO_ROLE_KEY = 'deputy_spo';

/** Seeded roles that must be present + assigned to generate the doc (key + fallback label). */
const REQUIRED_SEED_ROLES: { key: string; label: string }[] = [
  { key: 'top_management', label: 'Top Management' },
  { key: SPO_ROLE_KEY, label: 'Security & Privacy Owner (SPO)' },
  { key: DEPUTY_SPO_ROLE_KEY, label: 'Deputy Security & Privacy Owner' },
  { key: INTERNAL_AUDITOR_ROLE_KEY, label: 'Internal Auditor' },
];

/**
 * The document-generation validation (5.3): every seeded role must be present and
 * have at least one assigned member (except Deputy SPO in the 1-3 band), and the
 * Internal Auditor must have a route selected. Iterates the REQUIRED keys (not
 * just the roles present) so an entirely-missing seeded row is caught too. Returns
 * the unmet requirements, empty when valid. Mirrors the server gate in the API's
 * documents/roles.ts roleValidationMessages.
 */
export function roleValidationMessages({
  roles,
  band,
}: {
  roles: IsmsRole[];
  band: IsmsTeamSizeBand;
}): string[] {
  const byKey = new Map(
    roles.filter((role) => role.roleKey).map((role) => [role.roleKey, role]),
  );
  const messages: string[] = [];
  for (const { key, label } of REQUIRED_SEED_ROLES) {
    const role = byKey.get(key);
    const name = role?.name ?? label;
    const optional = key === DEPUTY_SPO_ROLE_KEY && band === 'small';
    if (!role) {
      if (!optional) messages.push(`${name} is missing from the document.`);
      continue;
    }
    if (!optional && role.assignments.length === 0) {
      messages.push(`${name} needs at least one assigned member.`);
    }
    if (key === INTERNAL_AUDITOR_ROLE_KEY && !role.auditRoute) {
      messages.push('The Internal Auditor needs an audit route selected.');
    }
  }
  return messages;
}
