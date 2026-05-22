export interface RetryPreviewData {
  guidedOnly?: boolean;
  missingPermissions?: string[];
}

export type RetryPreviewDecision =
  | { type: 'continue' }
  | { type: 'needs_permissions'; missingPermissions: string[] }
  | { type: 'manual'; error: string };

export function classifyRetryPreview(data: RetryPreviewData | undefined): RetryPreviewDecision {
  if (data?.missingPermissions && data.missingPermissions.length > 0) {
    return {
      type: 'needs_permissions',
      missingPermissions: data.missingPermissions,
    };
  }

  if (data?.guidedOnly) {
    return {
      type: 'manual',
      error: 'This finding requires manual remediation and cannot be auto-fixed.',
    };
  }

  return { type: 'continue' };
}
