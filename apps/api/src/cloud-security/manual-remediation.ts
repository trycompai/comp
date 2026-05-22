const MANUAL_PREFIX = '[MANUAL]';

type ManualRemediationRisk = 'info' | 'low' | 'medium' | 'high' | 'critical';

export interface ManualRemediationPreview {
  currentState: Record<string, unknown>;
  proposedState: Record<string, unknown>;
  description: string;
  risk: ManualRemediationRisk;
  apiCalls: string[];
  guidedOnly: true;
  guidedSteps: string[];
  rollbackSupported: false;
  requiresAcknowledgment: undefined;
}

export function isManualRemediation(remediation?: string | null): boolean {
  return remediation?.trim().startsWith(MANUAL_PREFIX) ?? false;
}

export function buildManualRemediationPreview(params: {
  remediation: string;
  description?: string | null;
  severity?: string | null;
}): ManualRemediationPreview {
  const guidance = params.remediation.trim().replace(MANUAL_PREFIX, '').trim();
  const description =
    guidance ||
    params.description ||
    'This finding requires manual remediation.';

  return {
    currentState: {},
    proposedState: {},
    description,
    risk: normalizeRisk(params.severity),
    apiCalls: [],
    guidedOnly: true,
    guidedSteps: [description],
    rollbackSupported: false,
    requiresAcknowledgment: undefined,
  };
}

function normalizeRisk(severity?: string | null): ManualRemediationRisk {
  if (
    severity === 'low' ||
    severity === 'medium' ||
    severity === 'high' ||
    severity === 'critical' ||
    severity === 'info'
  ) {
    return severity;
  }

  return 'medium';
}
