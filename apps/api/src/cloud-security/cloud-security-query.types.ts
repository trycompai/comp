/**
 * Public response shapes for /v1/cloud-security/providers and /findings.
 * Extracted from cloud-security-query.service.ts to keep that file under the
 * 300-line cap. The service and legacy helpers both import from here.
 */

/**
 * Summary of the most recent successful (or failed) scan for a connection.
 * Surfaced on the providers payload so the UI can show "47 checks evaluated,
 * 41 passed, 6 failed, ran 12s ago, duration 3.2s" without a second fetch.
 *
 * Legacy connections only populate `completedAt` (and `status: 'success'`)
 * because per-run counts are not stored in the legacy Integration model.
 */
export interface CloudProviderLatestRun {
  completedAt: Date | null;
  durationMs: number | null;
  totalChecked: number | null;
  passedCount: number | null;
  failedCount: number | null;
  status: string;
}

export interface CloudProvider {
  id: string;
  integrationId: string;
  name: string;
  displayName?: string;
  organizationId: string;
  lastRunAt: Date | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  reconnectedAt?: Date;
  isLegacy: boolean;
  variables: Record<string, unknown> | null;
  requiredVariables: string[];
  accountId?: string;
  awsType?: string;
  regions?: string[];
  tenantId?: string;
  subscriptionId?: string;
  supportsMultipleConnections?: boolean;
  latestRun: CloudProviderLatestRun | null;
}

export interface CloudFinding {
  id: string;
  title: string | null;
  description: string | null;
  remediation: string | null;
  status: string | null;
  severity: string | null;
  completedAt: Date | null;
  connectionId: string;
  providerSlug: string;
  serviceId: string | null;
  findingKey: string | null;
  resourceId: string | null;
  resourceType: string | null;
  /** Run-level checkId (e.g. "aws-security-scan") — coarse, identifies the scan kind. */
  checkId: string | null;
  /**
   * Normalized per-check identifier (e.g. "iam-no-mfa"), shared by every
   * resource instance of the same logical check. Used by the UI to group
   * findings into check sub-groups and by Phase 2 caching.
   */
  checkKey: string | null;
  /** Sanitized provider payload — sensitive keys redacted by evidence-sanitizer. */
  evidence: unknown;
  projectDisplayName: string | null;
  integration: { integrationId: string };
}
