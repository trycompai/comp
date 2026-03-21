import type { MultiSelectOption } from '../../components/table';

export const DOCUMENT_TYPE_OPTIONS: MultiSelectOption[] = [
  { value: 'board-meeting', label: 'Board Meeting', category: 'Governance' },
  { value: 'it-leadership-meeting', label: 'IT Leadership Meeting', category: 'Governance' },
  { value: 'risk-committee-meeting', label: 'Risk Committee Meeting', category: 'Governance' },
  { value: 'meeting', label: 'Meeting Minutes', category: 'Governance' },
  { value: 'access-request', label: 'Access Request', category: 'Security' },
  { value: 'penetration-test', label: 'Penetration Test', category: 'Security' },
  { value: 'rbac-matrix', label: 'RBAC Matrix', category: 'Security' },
  { value: 'infrastructure-inventory', label: 'Infrastructure Inventory', category: 'Security' },
  { value: 'network-diagram', label: 'Network Diagram', category: 'Security' },
  { value: 'tabletop-exercise', label: 'Incident Response Tabletop Exercise', category: 'Security' },
  { value: 'whistleblower-report', label: 'Whistleblower Report', category: 'People' },
  { value: 'employee-performance-evaluation', label: 'Employee Performance Evaluation', category: 'People' },
];

export function getDocumentTypeLabel(value: string): string {
  return DOCUMENT_TYPE_OPTIONS.find((opt) => opt.value === value)?.label ?? value;
}
