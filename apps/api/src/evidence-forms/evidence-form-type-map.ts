import { EvidenceFormType as DbEvidenceFormType } from '@trycompai/db';
import { type EvidenceFormType } from './evidence-forms.definitions';

const EXTERNAL_TO_DB: Record<EvidenceFormType, DbEvidenceFormType> = {
  'board-meeting': DbEvidenceFormType.board_meeting,
  'it-leadership-meeting': DbEvidenceFormType.it_leadership_meeting,
  'risk-committee-meeting': DbEvidenceFormType.risk_committee_meeting,
  meeting: DbEvidenceFormType.meeting,
  'access-request': DbEvidenceFormType.access_request,
  'whistleblower-report': DbEvidenceFormType.whistleblower_report,
  'penetration-test': DbEvidenceFormType.penetration_test,
  'rbac-matrix': DbEvidenceFormType.rbac_matrix,
  'infrastructure-inventory': DbEvidenceFormType.infrastructure_inventory,
  'employee-performance-evaluation':
    DbEvidenceFormType.employee_performance_evaluation,
};

const DB_TO_EXTERNAL: Record<DbEvidenceFormType, EvidenceFormType> = {
  [DbEvidenceFormType.board_meeting]: 'board-meeting',
  [DbEvidenceFormType.it_leadership_meeting]: 'it-leadership-meeting',
  [DbEvidenceFormType.risk_committee_meeting]: 'risk-committee-meeting',
  [DbEvidenceFormType.meeting]: 'meeting',
  [DbEvidenceFormType.access_request]: 'access-request',
  [DbEvidenceFormType.whistleblower_report]: 'whistleblower-report',
  [DbEvidenceFormType.penetration_test]: 'penetration-test',
  [DbEvidenceFormType.rbac_matrix]: 'rbac-matrix',
  [DbEvidenceFormType.infrastructure_inventory]: 'infrastructure-inventory',
  [DbEvidenceFormType.employee_performance_evaluation]:
    'employee-performance-evaluation',
};

export function toDbEvidenceFormType(
  formType: EvidenceFormType,
): DbEvidenceFormType {
  return EXTERNAL_TO_DB[formType];
}

export function toExternalEvidenceFormType(
  formType: DbEvidenceFormType | null | undefined,
): EvidenceFormType | null {
  if (!formType) return null;
  return DB_TO_EXTERNAL[formType];
}
