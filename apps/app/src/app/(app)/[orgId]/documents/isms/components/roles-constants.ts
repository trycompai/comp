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

/** Seeded roles that must have at least one assigned member to generate the doc. */
const REQUIRED_SEED_ROLE_KEYS = [
  'top_management',
  SPO_ROLE_KEY,
  DEPUTY_SPO_ROLE_KEY,
  INTERNAL_AUDITOR_ROLE_KEY,
];

/**
 * The document-generation validation (5.3): every seeded role has at least one
 * assigned member (except Deputy SPO in the 1-3 band), and the Internal Auditor
 * has a route selected. Returns the unmet requirements, empty when valid.
 */
export function roleValidationMessages({
  roles,
  band,
}: {
  roles: IsmsRole[];
  band: IsmsTeamSizeBand;
}): string[] {
  const messages: string[] = [];
  for (const role of roles) {
    if (!role.roleKey || !REQUIRED_SEED_ROLE_KEYS.includes(role.roleKey)) {
      continue;
    }
    const optional = role.roleKey === DEPUTY_SPO_ROLE_KEY && band === 'small';
    if (!optional && role.assignments.length === 0) {
      messages.push(`${role.name} needs at least one assigned member.`);
    }
    if (role.roleKey === INTERNAL_AUDITOR_ROLE_KEY && !role.auditRoute) {
      messages.push('The Internal Auditor needs an audit route selected.');
    }
  }
  return messages;
}
