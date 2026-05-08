import { EvidenceFormType } from '@db';

// Prisma `EvidenceFormType` enum values are snake_case at the TS level
// (Prisma maps them to kebab-case strings in the DB). The `/documents/[formType]`
// URL uses the kebab-case form, so we convert when navigating.

// Typed as Record<EvidenceFormType, string> so adding a new form-type to the
// Prisma enum without updating this map becomes a compile error.
export const DOCUMENT_TYPE_LABELS: Record<EvidenceFormType, string> = {
  meeting: 'Meeting',
  board_meeting: 'Board Meeting',
  it_leadership_meeting: 'IT Leadership Meeting',
  risk_committee_meeting: 'Risk Committee Meeting',
  access_request: 'Access Request',
  whistleblower_report: 'Whistleblower Report',
  penetration_test: 'Penetration Test',
  rbac_matrix: 'RBAC Matrix',
  infrastructure_inventory: 'Infrastructure Inventory',
  employee_performance_evaluation: 'Employee Performance Evaluation',
  network_diagram: 'Network Diagram',
  tabletop_exercise: 'Tabletop Exercise',
};

export const ALL_DOCUMENT_TYPES = Object.keys(
  DOCUMENT_TYPE_LABELS,
) as EvidenceFormType[];

export function getDocumentTypeLabel(formType: EvidenceFormType | string): string {
  return DOCUMENT_TYPE_LABELS[formType as EvidenceFormType] ?? formType;
}

export function toDocumentUrlSlug(formType: string): string {
  return formType.replace(/_/g, '-');
}
