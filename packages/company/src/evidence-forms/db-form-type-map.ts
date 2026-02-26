import { EvidenceFormType as DbEvidenceFormType } from '@trycompai/db';
import type { EvidenceFormType } from './form-types';

export const EXTERNAL_TO_DB_EVIDENCE_FORM_TYPE = {
  'board-meeting': 'board_meeting',
  'it-leadership-meeting': 'it_leadership_meeting',
  'risk-committee-meeting': 'risk_committee_meeting',
  meeting: 'meeting',
  'access-request': 'access_request',
  'whistleblower-report': 'whistleblower_report',
  'penetration-test': 'penetration_test',
  'rbac-matrix': 'rbac_matrix',
  'infrastructure-inventory': 'infrastructure_inventory',
  'employee-performance-evaluation': 'employee_performance_evaluation',
  'network-diagram': 'network_diagram',
  'tabletop-exercise': 'tabletop_exercise',
} as const satisfies Record<EvidenceFormType, string>;

export type DbEvidenceFormTypeValue = (typeof EXTERNAL_TO_DB_EVIDENCE_FORM_TYPE)[EvidenceFormType];

export const DB_TO_EXTERNAL_EVIDENCE_FORM_TYPE = {
  board_meeting: 'board-meeting',
  it_leadership_meeting: 'it-leadership-meeting',
  risk_committee_meeting: 'risk-committee-meeting',
  meeting: 'meeting',
  access_request: 'access-request',
  whistleblower_report: 'whistleblower-report',
  penetration_test: 'penetration-test',
  rbac_matrix: 'rbac-matrix',
  infrastructure_inventory: 'infrastructure-inventory',
  employee_performance_evaluation: 'employee-performance-evaluation',
  network_diagram: 'network-diagram',
  tabletop_exercise: 'tabletop-exercise',
} as const satisfies Record<DbEvidenceFormTypeValue, EvidenceFormType>;

export function toDbEvidenceFormTypeValue(formType: EvidenceFormType): DbEvidenceFormTypeValue {
  return EXTERNAL_TO_DB_EVIDENCE_FORM_TYPE[formType];
}

export function toExternalEvidenceFormTypeValue(
  formType: DbEvidenceFormTypeValue | null | undefined,
): EvidenceFormType | null {
  if (!formType) return null;
  return DB_TO_EXTERNAL_EVIDENCE_FORM_TYPE[formType];
}

export function toDbEvidenceFormType(formType: EvidenceFormType): DbEvidenceFormType {
  return DbEvidenceFormType[toDbEvidenceFormTypeValue(formType)];
}

export function toExternalEvidenceFormType(
  formType: DbEvidenceFormType | null | undefined,
): EvidenceFormType | null {
  if (!formType) return null;
  return toExternalEvidenceFormTypeValue(formType);
}
