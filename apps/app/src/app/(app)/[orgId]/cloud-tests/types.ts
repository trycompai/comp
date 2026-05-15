export interface Finding {
  id: string;
  title: string | null;
  description: string | null;
  remediation: string | null;
  status: string | null;
  severity: string | null;
  serviceId: string | null;
  findingKey: string | null;
  resourceId: string | null;
  /** Provider-side resource classification, e.g. "AwsIamUser", "S3Bucket". */
  resourceType: string | null;
  /** Run-level checkId (e.g. "aws-security-scan") — coarse. */
  checkId: string | null;
  /**
   * Normalized per-check identifier (e.g. "iam-no-mfa") shared across all
   * resource instances of the same logical check. Used to group findings
   * into check sub-groups in the UI.
   */
  checkKey: string | null;
  /**
   * Sanitized provider payload — sensitive keys are redacted server-side
   * by evidence-sanitizer before this is sent to the client.
   */
  evidence: unknown;
  projectDisplayName: string | null;
  completedAt: Date | null;
  connectionId: string;
  providerSlug: string;
  integration: {
    integrationId: string;
  };
}

/**
 * Summary of the most recent scan run for a provider connection. Surfaced
 * directly on the providers payload so the UI can render run metadata
 * (count, duration, pass/fail breakdown) without a second fetch.
 *
 * Legacy connections only populate `completedAt` — per-run counters are
 * not stored in the legacy Integration model.
 */
export interface ProviderLatestRun {
  completedAt: Date | null;
  durationMs: number | null;
  totalChecked: number | null;
  passedCount: number | null;
  failedCount: number | null;
  status: string;
}

export interface Provider {
  id: string;
  integrationId: string;
  name: string;
  displayName?: string;
  organizationId: string;
  lastRunAt: Date | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  reconnectedAt?: Date | string | null;
  isLegacy?: boolean;
  variables?: Record<string, unknown> | null;
  requiredVariables?: string[];
  accountId?: string;
  awsType?: string;
  regions?: string[];
  tenantId?: string;
  subscriptionId?: string;
  supportsMultipleConnections?: boolean;
  latestRun?: ProviderLatestRun | null;
}
export type FailedIntegration = {
  id: string;
  integrationId: string;
  name: string;
  error: string;
};

export type IntegrationRunOutput = {
  success: boolean;
  organizationId: string;
  integrationsCount: number;
  batchHandleId?: string;
  errors?: string[];
  failedIntegrations?: FailedIntegration[];
};
