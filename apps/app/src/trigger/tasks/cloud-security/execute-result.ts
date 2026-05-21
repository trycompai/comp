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
