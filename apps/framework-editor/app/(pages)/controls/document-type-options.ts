import type { MultiSelectOption } from '../../components/table';

export const DOCUMENT_TYPE_OPTIONS: MultiSelectOption[] = [
  { value: 'board_meeting', label: 'Board Meeting', category: 'Governance' },
  { value: 'it_leadership_meeting', label: 'IT Leadership Meeting', category: 'Governance' },
  { value: 'risk_committee_meeting', label: 'Risk Committee Meeting', category: 'Governance' },
  { value: 'meeting', label: 'Meeting Minutes', category: 'Governance' },
  { value: 'access_request', label: 'Access Request', category: 'Security' },
  { value: 'penetration_test', label: 'Penetration Test', category: 'Security' },
  { value: 'rbac_matrix', label: 'RBAC Matrix', category: 'Security' },
  { value: 'infrastructure_inventory', label: 'Infrastructure Inventory', category: 'Security' },
  { value: 'network_diagram', label: 'Network Diagram', category: 'Security' },
  { value: 'tabletop_exercise', label: 'Incident Response Tabletop Exercise', category: 'Security' },
  { value: 'whistleblower_report', label: 'Whistleblower Report', category: 'People' },
  { value: 'employee_performance_evaluation', label: 'Employee Performance Evaluation', category: 'People' },
];

export function getDocumentTypeLabel(value: string): string {
  return DOCUMENT_TYPE_OPTIONS.find((opt) => opt.value === value)?.label ?? value;
}
