import type { CompletionCandidate } from '../../src/cloud-security/aws-task-completion';
import type { SecurityFinding } from '../../src/cloud-security/cloud-security.service';

export const NOW = new Date('2026-01-02T03:04:05.000Z');
export const CRITERIA = 'Require complete collected evidence and a pass.';

export function candidate(
  overrides: Partial<CompletionCandidate> = {},
): CompletionCandidate {
  return {
    id: 'synthetic-task',
    status: 'failed',
    automationStatus: 'AUTOMATED',
    archivedAt: null,
    updatedAt: NOW,
    approverId: null,
    taskTemplateId: 'frk_tt_68e52b26bf0e656af9e4e9c3',
    frequency: null,
    organization: { evidenceApprovalEnabled: true },
    evidenceAutomations: [
      {
        id: 'synthetic-automation',
        evaluationCriteria: CRITERIA,
        versions: [
          {
            id: 'published-version',
            version: 2,
            updatedAt: NOW,
            scriptKey: 'v2',
          },
        ],
        runs: [
          {
            id: 'latest-run',
            createdAt: NOW,
            updatedAt: NOW,
            startedAt: NOW,
            completedAt: NOW,
            status: 'completed',
            success: true,
            evaluationStatus: 'pass',
            evaluationCriteriaSnapshot: CRITERIA,
            version: 2,
          },
        ],
      },
    ],
    ...overrides,
  };
}

export function finding({
  serviceId = 'kms',
  passed = true,
}: {
  serviceId?: string;
  passed?: boolean;
} = {}): SecurityFinding {
  return {
    id: 'synthetic-finding',
    title: 'Synthetic metadata check',
    description: 'No cloud resources or credentials are used.',
    severity: 'info',
    resourceType: 'synthetic-resource',
    resourceId: 'synthetic-resource',
    evidence: { serviceId },
    createdAt: NOW.toISOString(),
    passed,
  };
}
