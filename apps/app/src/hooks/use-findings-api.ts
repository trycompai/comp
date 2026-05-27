'use client';

import { useApi } from '@/hooks/use-api';
import { useApiSWR, UseApiSWROptions } from '@/hooks/use-api-swr';
import type { EvidenceFormType } from '@trycompai/company';
import { FindingType } from '@db';
import type { FindingArea, FindingSeverity, FindingStatus } from '@db';
import { useCallback } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Finding {
  id: string;
  type: FindingType;
  status: FindingStatus;
  severity: FindingSeverity;
  content: string;
  revisionNote: string | null;
  area: FindingArea | null;
  createdAt: string;
  updatedAt: string;

  // Targets — exactly one of these (or `area`) is populated for any finding
  taskId: string | null;
  evidenceSubmissionId: string | null;
  evidenceFormType: EvidenceFormType | null;
  policyId: string | null;
  vendorId: string | null;
  riskId: string | null;
  memberId: string | null;
  deviceId: string | null;

  templateId: string | null;
  createdById: string | null;
  organizationId: string;

  createdBy: {
    id: string;
    user: { id: string; name: string; email: string; image: string | null };
  } | null;
  createdByAdmin: {
    id: string;
    name: string;
    email: string;
    image: string | null;
  } | null;
  template: { id: string; category: string; title: string } | null;
  task: { id: string; title: string } | null;
  evidenceSubmission: {
    id: string;
    formType: EvidenceFormType;
    submittedAt: string;
    submittedById: string | null;
  } | null;
  policy: { id: string; name: string } | null;
  vendor: { id: string; name: string } | null;
  risk: { id: string; title: string } | null;
  member: {
    id: string;
    user: { id: string; name: string; email: string; image: string | null };
  } | null;
  device: { id: string; name: string; hostname: string } | null;
}

export interface FindingTemplate {
  id: string;
  category: string;
  title: string;
  content: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

/** Payload for creating a finding — exactly one target (or area) must be set. */
export interface CreateFindingData {
  taskId?: string;
  evidenceSubmissionId?: string;
  evidenceFormType?: EvidenceFormType;
  policyId?: string;
  vendorId?: string;
  riskId?: string;
  memberId?: string;
  deviceId?: string;
  area?: FindingArea;
  type?: FindingType;
  severity?: FindingSeverity;
  templateId?: string;
  content: string;
}

export interface UpdateFindingData {
  status?: FindingStatus;
  type?: FindingType;
  severity?: FindingSeverity;
  content?: string;
  revisionNote?: string | null;
}

export interface FindingHistoryEntry {
  id: string;
  timestamp: string;
  description: string;
  data: {
    action: string;
    findingId: string;
    previousStatus?: FindingStatus;
    newStatus?: FindingStatus;
    previousType?: FindingType;
    newType?: FindingType;
    previousContent?: string;
    newContent?: string;
    targetKind?: string;
    targetId?: string | null;
    targetLabel?: string | null;
    // Legacy: present on creation entries written before the unified-findings
    // migration. Values: 'people' | 'people_tasks' | 'people_devices' | 'people_chart'.
    findingScope?: string;
    content?: string;
    type?: FindingType;
    status?: FindingStatus;
  };
  user: { id: string; name: string; email: string; image: string | null };
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

const DEFAULT_FINDINGS_POLLING_INTERVAL = 10000;

export interface UseFindingsOptions extends UseApiSWROptions<Finding[]> {}

export interface OrganizationFindingsFilters {
  status?: FindingStatus;
  area?: FindingArea;
  taskId?: string;
  evidenceSubmissionId?: string;
  evidenceFormType?: EvidenceFormType;
  policyId?: string;
  vendorId?: string;
  riskId?: string;
  memberId?: string;
  deviceId?: string;
}

function buildFindingsQuery(filters: OrganizationFindingsFilters): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value));
    }
  }
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

/** Fetch findings for the organization (optionally filtered by status/target). */
export function useOrganizationFindings(
  filters: OrganizationFindingsFilters = {},
  options: UseFindingsOptions = {},
) {
  const endpoint = `/v1/findings${buildFindingsQuery(filters)}`;

  return useApiSWR<Finding[]>(endpoint, {
    ...options,
    refreshInterval:
      options.refreshInterval ?? DEFAULT_FINDINGS_POLLING_INTERVAL,
  });
}

export function useFindingTemplates(
  options: UseApiSWROptions<FindingTemplate[]> = {},
) {
  return useApiSWR<FindingTemplate[]>('/v1/finding-template', options);
}

export function useFindingHistory(
  findingId: string | null,
  options: UseApiSWROptions<FindingHistoryEntry[]> = {},
) {
  const endpoint = findingId ? `/v1/findings/${findingId}/history` : null;

  return useApiSWR<FindingHistoryEntry[]>(endpoint, {
    ...options,
    refreshInterval:
      options.refreshInterval ?? DEFAULT_FINDINGS_POLLING_INTERVAL,
  });
}

export function useFindingActions() {
  const api = useApi();

  const createFinding = useCallback(
    async (data: CreateFindingData) => {
      const response = await api.post<Finding>('/v1/findings', data);
      if (response.error) throw new Error(response.error);
      return response.data!;
    },
    [api],
  );

  const updateFinding = useCallback(
    async (findingId: string, data: UpdateFindingData) => {
      const response = await api.patch<Finding>(
        `/v1/findings/${findingId}`,
        data,
      );
      if (response.error) throw new Error(response.error);
      return response.data!;
    },
    [api],
  );

  const deleteFinding = useCallback(
    async (findingId: string) => {
      const response = await api.delete(`/v1/findings/${findingId}`);
      if (response.error) throw new Error(response.error);
      return { success: true };
    },
    [api],
  );

  return { createFinding, updateFinding, deleteFinding };
}

export function useGroupedFindingTemplates(
  options: UseApiSWROptions<FindingTemplate[]> = {},
) {
  const { data, ...rest } = useFindingTemplates(options);

  const groupedTemplates = data?.data?.reduce(
    (acc, template) => {
      if (!acc[template.category]) acc[template.category] = [];
      acc[template.category].push(template);
      return acc;
    },
    {} as Record<string, FindingTemplate[]>,
  );

  return {
    ...rest,
    data: data ? { ...data, grouped: groupedTemplates } : undefined,
  };
}

// ---------------------------------------------------------------------------
// Display constants
// ---------------------------------------------------------------------------

export const FINDING_CATEGORY_LABELS: Record<string, string> = {
  evidence_issue: 'Issue with uploaded evidence',
  further_evidence: 'Further evidence needed',
  task_specific: 'Task-specific issues',
  na_incorrect: 'Marked N/A incorrectly',
};

export const FINDING_STATUS_CONFIG: Record<
  FindingStatus,
  { label: string; color: string; bgColor: string; icon: string }
> = {
  open: { label: 'Open', color: 'text-red-600', bgColor: 'bg-red-100', icon: '🔴' },
  ready_for_review: {
    label: 'Ready for Review',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
    icon: '🟡',
  },
  needs_revision: {
    label: 'Needs Revision',
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
    icon: '🟠',
  },
  closed: {
    label: 'Closed',
    color: 'text-primary',
    bgColor: 'bg-primary/10',
    icon: '✓',
  },
};

export const FINDING_SEVERITY_CONFIG: Record<
  FindingSeverity,
  { label: string; color: string; bgColor: string }
> = {
  low: { label: 'Low', color: 'text-muted-foreground', bgColor: 'bg-muted' },
  medium: {
    label: 'Medium',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-100',
  },
  high: { label: 'High', color: 'text-orange-700', bgColor: 'bg-orange-100' },
  critical: { label: 'Critical', color: 'text-red-700', bgColor: 'bg-red-100' },
};

export const FINDING_TYPE_FRAMEWORK_OPTIONS = [
  { value: 'soc2', label: 'SOC 2' },
  { value: 'iso27001', label: 'ISO 27001' },
  { value: 'pci_dss', label: 'PCI DSS' },
  { value: 'hipaa', label: 'HIPAA' },
  { value: 'gdpr', label: 'GDPR' },
  { value: 'iso9001', label: 'ISO 9001' },
  { value: 'iso42001', label: 'ISO 42001' },
] as const;

export const FINDING_TYPE_LABELS: Record<FindingType, string> = {
  soc2: 'SOC 2',
  iso27001: 'ISO 27001',
  pci_dss: 'PCI DSS',
  hipaa: 'HIPAA',
  gdpr: 'GDPR',
  iso9001: 'ISO 9001',
  iso42001: 'ISO 42001',
};

/**
 * Maps a FrameworkEditorFramework `name` to the matching FindingType. Order
 * matters only as a tiebreaker — patterns are mutually exclusive on the canonical
 * platform names ("SOC 2", "ISO 27001", "PCI DSS", "HIPAA", "GDPR", "ISO 9001",
 * "ISO 42001"). Kept lenient on whitespace so versioned/locale variants still
 * match (e.g. "ISO/IEC 27001:2022").
 */
const FRAMEWORK_NAME_MATCHERS: { pattern: RegExp; type: FindingType }[] = [
  { pattern: /iso\s*\/?\s*(?:iec\s*)?27001/i, type: FindingType.iso27001 },
  { pattern: /iso\s*\/?\s*(?:iec\s*)?42001/i, type: FindingType.iso42001 },
  { pattern: /iso\s*\/?\s*(?:iec\s*)?9001/i, type: FindingType.iso9001 },
  { pattern: /pci[\s_-]*dss/i, type: FindingType.pci_dss },
  { pattern: /hipaa/i, type: FindingType.hipaa },
  { pattern: /gdpr/i, type: FindingType.gdpr },
  { pattern: /soc\s*2/i, type: FindingType.soc2 },
];

/**
 * Unwraps the `/v1/frameworks` response shape. SWR wraps it as
 * `{ data: <api> }`, and the list endpoint returns `{ data: [...], count, ... }`,
 * so the items can sit one or two envelopes deep.
 */
function unwrapFrameworksList(payload: unknown): unknown[] {
  const root = (payload as { data?: unknown })?.data;
  if (Array.isArray(root)) return root;
  const inner = (root as { data?: unknown })?.data;
  if (Array.isArray(inner)) return inner;
  return [];
}

/**
 * Derive the list of FindingTypes an org can log against, based on the
 * `/v1/frameworks` response. Pure (no React/SWR coupling) so it can be unit-
 * tested directly. Unknown framework names are ignored.
 */
export function extractOrgFrameworkTypes(payload: unknown): FindingType[] {
  const types = new Set<FindingType>();
  for (const raw of unwrapFrameworksList(payload)) {
    const item = raw as Record<string, unknown>;
    // FrameworkInstance rows nest the platform framework under `framework`;
    // custom/platform-direct rows have `name` at the root.
    const fw = (item.framework ?? item) as { name?: unknown } | undefined;
    const name = typeof fw?.name === 'string' ? fw.name : '';
    if (!name) continue;
    const match = FRAMEWORK_NAME_MATCHERS.find(({ pattern }) =>
      pattern.test(name),
    );
    if (match) types.add(match.type);
  }
  return Array.from(types);
}

export const DEFAULT_FINDING_TEMPLATES: FindingTemplate[] = [
  {
    id: 'default_evidence_issue_01',
    category: 'evidence_issue',
    title: 'Missing organization context',
    content:
      'The uploaded evidence does not clearly show the Organization Name or URL. Please provide a screenshot showing the context.',
    order: 1,
    createdAt: '',
    updatedAt: '',
  },
  {
    id: 'default_evidence_issue_02',
    category: 'evidence_issue',
    title: 'Evidence outside audit window',
    content:
      'The evidence date falls outside the currently active audit observation window. Please ensure evidence is relevant to the current period.',
    order: 2,
    createdAt: '',
    updatedAt: '',
  },
  {
    id: 'default_evidence_issue_03',
    category: 'evidence_issue',
    title: 'Unreadable or corrupted file',
    content:
      'The auditor could not open or read the file due to low resolution or corruption. Please re-upload a clear copy.',
    order: 3,
    createdAt: '',
    updatedAt: '',
  },
  {
    id: 'default_further_evidence_01',
    category: 'further_evidence',
    title: 'Statement of intent - need proof of operation',
    content:
      'The attached document(s) is a statement of intent. This control requires Evidence of Operation (proof of action). Please upload specific logs, screenshots, system configs, or tickets that demonstrate this policy is currently being enforced.',
    order: 1,
    createdAt: '',
    updatedAt: '',
  },
  {
    id: 'default_further_evidence_02',
    category: 'further_evidence',
    title: 'No evidence attached',
    content:
      "This task was marked as 'Done', but no file was attached. For an external audit, every completed task requires proof of execution. Please upload the specific evidence (screenshot, PDF, or export) and re-submit.",
    order: 2,
    createdAt: '',
    updatedAt: '',
  },
  {
    id: 'default_task_specific_01',
    category: 'task_specific',
    title: 'Pull Request samples required',
    content:
      'Please upload a sample of recently merged Pull Requests (5 examples). The evidence must clearly show: 1. The Author, 2. The Approver (must be different from the author), and 3. The Build/Test Status checks.',
    order: 1,
    createdAt: '',
    updatedAt: '',
  },
  {
    id: 'default_task_specific_02',
    category: 'task_specific',
    title: 'Alert screenshot required',
    content:
      'Please upload a screenshot of an actual triggered alert (e.g., a notification from PagerDuty, Slack, or Email). The evidence must clearly show: 1. The Alert Name, 2. The Timestamp, and 3. The Severity Level.',
    order: 2,
    createdAt: '',
    updatedAt: '',
  },
  {
    id: 'default_task_specific_03',
    category: 'task_specific',
    title: 'System logs sample required',
    content:
      'Please provide a sample of System or Infrastructure Logs (e.g., AWS CloudWatch, Google Cloud Logging, Datadog). The sample must clearly show headers including: Timestamp, Event/Error Message, and Source/User.',
    order: 3,
    createdAt: '',
    updatedAt: '',
  },
  {
    id: 'default_na_incorrect_01',
    category: 'na_incorrect',
    title: 'Control required for compliance',
    content:
      'This control is required for SOC 2 compliance, regardless of company size. However, the evidence can be scaled down to fit your stage. Please see the guidance documentation for acceptable lightweight evidence.',
    order: 1,
    createdAt: '',
    updatedAt: '',
  },
];
