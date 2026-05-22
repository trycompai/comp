interface PermissionError {
  missingActions: string[];
  fixScript?: string;
}

type ExecuteClassification =
  | { type: 'success'; actionId?: string }
  | {
      type: 'needs_permissions';
      error: string;
      permissionError: PermissionError;
    }
  | {
      type: 'manual';
      reason: string;
      guidedSteps: string[];
    }
  | { type: 'failed'; error: string };

export function classifyExecuteResult(value: unknown): ExecuteClassification {
  if (!value || typeof value !== 'object') {
    return { type: 'failed', error: 'API returned an empty remediation response' };
  }

  const record = value as Record<string, unknown>;
  const permissionError = parsePermissionError(record.permissionError);
  const error = getErrorMessage(record.error);
  const status = record.status;

  if (permissionError) {
    return {
      type: 'needs_permissions',
      error: error ?? 'Missing permissions',
      permissionError,
    };
  }

  // Manual-steps fallback: the API decided auto-fix can't proceed and
  // is returning real, customer-actionable instructions. Surface them
  // verbatim so the dialog can render them instead of a raw error.
  const guidedSteps = parseGuidedSteps(record.guidedSteps);
  if (record.guidedOnly === true && guidedSteps && guidedSteps.length > 0) {
    return {
      type: 'manual',
      reason:
        error ??
        'Automatic fix could not be applied — follow the guided steps.',
      guidedSteps,
    };
  }

  if (status === 'success') {
    return {
      type: 'success',
      actionId: typeof record.actionId === 'string' ? record.actionId : undefined,
    };
  }

  if (status === 'failed') {
    return { type: 'failed', error: error ?? 'Remediation failed' };
  }

  if (status === 'unverified') {
    return {
      type: 'failed',
      error: error ?? 'Remediation completed but could not be verified',
    };
  }

  return {
    type: 'failed',
    error: 'API returned an invalid remediation response',
  };
}

function parseGuidedSteps(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const steps = value.filter(
    (step): step is string => typeof step === 'string' && step.trim().length > 0,
  );
  return steps.length > 0 ? steps : undefined;
}

function parsePermissionError(value: unknown): PermissionError | undefined {
  if (!value || typeof value !== 'object') return undefined;

  const record = value as Record<string, unknown>;
  if (!Array.isArray(record.missingActions)) return undefined;

  const missingActions = record.missingActions.filter(
    (action): action is string => typeof action === 'string',
  );
  if (missingActions.length === 0) return undefined;

  return {
    missingActions,
    ...(typeof record.fixScript === 'string' && { fixScript: record.fixScript }),
  };
}

function getErrorMessage(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
}
