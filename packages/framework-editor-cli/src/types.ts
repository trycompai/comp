export interface StoredCredentials {
  sessionToken: string;
  userId: string;
  apiUrl: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface Framework {
  id: string;
  name: string;
  version: string;
  description: string;
  visible: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FrameworkWithCounts extends Framework {
  requirementsCount?: number;
  controlsCount?: number;
}

export interface Requirement {
  id: string;
  frameworkId: string;
  name: string;
  identifier: string | null;
  description: string;
  createdAt: string;
  updatedAt: string;
  controlTemplates?: Array<{ id: string; name: string }>;
}

export interface ControlTemplate {
  id: string;
  name: string;
  description: string;
  documentTypes: string[];
  createdAt: string;
  updatedAt: string;
  policyTemplates?: Array<{ id: string; name: string }>;
  requirements?: Array<{ id: string; name: string }>;
  taskTemplates?: Array<{ id: string; name: string }>;
}

export interface PolicyTemplate {
  id: string;
  name: string;
  description: string;
  frequency: Frequency;
  department: Department;
  content: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  controlTemplates?: Array<{ id: string; name: string }>;
}

export interface TaskTemplate {
  id: string;
  name: string;
  description: string | null;
  frequency: Frequency | null;
  department: Department | null;
  automationStatus: TaskAutomationStatus | null;
  createdAt: string;
  updatedAt: string;
  controlTemplates?: Array<{ id: string; name: string }>;
}

export interface ControlDocument {
  id: string;
  name: string;
  documentTypes: string[];
}

export type Frequency = 'monthly' | 'quarterly' | 'yearly';
export type Department = 'none' | 'admin' | 'gov' | 'hr' | 'it' | 'itsm' | 'qms';
export type TaskAutomationStatus = 'AUTOMATED' | 'MANUAL';

export type EvidenceFormType =
  | 'board_meeting'
  | 'it_leadership_meeting'
  | 'risk_committee_meeting'
  | 'meeting'
  | 'access_request'
  | 'whistleblower_report'
  | 'penetration_test'
  | 'rbac_matrix'
  | 'infrastructure_inventory'
  | 'employee_performance_evaluation'
  | 'network_diagram'
  | 'tabletop_exercise';

export const FREQUENCY_VALUES: Frequency[] = ['monthly', 'quarterly', 'yearly'];
export const DEPARTMENT_VALUES: Department[] = ['none', 'admin', 'gov', 'hr', 'it', 'itsm', 'qms'];
export const AUTOMATION_STATUS_VALUES: TaskAutomationStatus[] = ['AUTOMATED', 'MANUAL'];
export const EVIDENCE_FORM_TYPE_VALUES: EvidenceFormType[] = [
  'board_meeting',
  'it_leadership_meeting',
  'risk_committee_meeting',
  'meeting',
  'access_request',
  'whistleblower_report',
  'penetration_test',
  'rbac_matrix',
  'infrastructure_inventory',
  'employee_performance_evaluation',
  'network_diagram',
  'tabletop_exercise',
];
