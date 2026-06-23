import type { RunAllChecksResult } from '@trycompai/integration-platform';
import type { SecurityFinding } from './cloud-security.service';

/**
 * GCP run-source tags persisted on IntegrationCheckRun.scanMode so
 * reconciliation only diffs same-source runs. Security Command Center findings
 * carry findingKeys; direct-API findings do not — cross-diffing the two would
 * mark every prior finding falsely "resolved".
 */
export const GCP_SCAN_MODE_SCC = 'gcp_scc';
export const GCP_SCAN_MODE_DIRECT = 'gcp_direct';

/**
 * Cloud Tests serviceId each GCP manifest check belongs to, so the direct-API
 * checks honor the user's per-service disable toggle the same way the SCC path
 * does. A check with NO entry here is never gated (always runs) — a missing
 * mapping must never silently hide findings.
 *
 * We gate on `disabledServices` (the explicit user opt-out) rather than the
 * full `enabledServices` set: `enabledServices` also requires a service to have
 * been auto-detected, but the direct checks are the always-on baseline (the
 * manual Scan button doesn't run detection first), so gating on detection could
 * hide real findings for a service the user never disabled.
 */
const GCP_CHECK_SERVICE: Record<string, string> = {
  'gcp-storage-no-public-access': 'cloud-storage',
  'gcp-storage-encryption': 'cloud-storage',
  'gcp-iam-no-primitive-roles': 'iam',
  'gcp-vpc-no-open-firewalls': 'vpc-network',
  'gcp-cloud-sql-ssl-enforced': 'cloud-sql',
  'gcp-cloud-sql-backups-enabled': 'cloud-sql',
  'gcp-cloud-sql-encryption': 'cloud-sql',
  'gcp-cloud-monitoring-alerting': 'cloud-monitoring',
  // gcp-environment-separation spans multiple services → intentionally ungated.
};

/** True when a check maps to a service the user explicitly disabled. */
export function isGcpCheckServiceDisabled(
  checkId: string,
  disabledServices: ReadonlySet<string>,
): boolean {
  const service = GCP_CHECK_SERVICE[checkId];
  return service !== undefined && disabledServices.has(service);
}

/**
 * True when an SCC error means SCC is structurally unavailable for the whole
 * connection (so the direct-API fallback is the right move), as opposed to a
 * transient/unknown error (where we'd rather preserve the prior run and let the
 * customer retry). Matches the structured errors thrown by
 * GCPSecurityService.fetchFindings:
 *   - 'SCC_NOT_ACTIVATED: …'  (SERVICE_DISABLED / not-used / 404 not-found)
 *   - '…Security Command Center Legacy has been disabled…'
 *   - 'Permission denied. Grant "Security Center Findings Viewer" …'
 *
 * Deliberately NOT matched (re-thrown so the prior run is preserved):
 *   - 'OAuth scopes insufficient…' — the same token drives the direct checks,
 *     so falling back would just fail again.
 *   - 'GCP API error (5xx): …'    — likely transient; retry beats degrading.
 */
export function isSccStructurallyUnavailable(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.startsWith('SCC_NOT_ACTIVATED:') ||
    message.includes('Security Command Center Legacy') ||
    message.includes('Security Center Findings Viewer')
  );
}

/**
 * Convert decrypted credentials to the `string | string[]` shape the
 * integration-platform check runner expects. Drops values that are neither a
 * string nor an all-string array (e.g. nested objects) rather than coercing.
 */
export function toCheckCredentials(
  credentials: Record<string, unknown>,
): Record<string, string | string[]> {
  const out: Record<string, string | string[]> = {};
  for (const [key, value] of Object.entries(credentials)) {
    if (typeof value === 'string') {
      out[key] = value;
    } else if (Array.isArray(value)) {
      const strings = value.filter((v): v is string => typeof v === 'string');
      if (strings.length === value.length) out[key] = strings;
    }
  }
  return out;
}

/**
 * Narrow connection.variables to the value types the check runner accepts
 * (string | number | boolean | string[] | undefined). Mixed-type arrays and
 * objects are dropped rather than coerced.
 */
export function toCheckVariables(
  variables: Record<string, unknown>,
): Record<string, string | number | boolean | string[] | undefined> {
  const out: Record<string, string | number | boolean | string[] | undefined> =
    {};
  for (const [key, value] of Object.entries(variables)) {
    if (
      value === undefined ||
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      out[key] = value;
    } else if (Array.isArray(value)) {
      const strings = value.filter((v): v is string => typeof v === 'string');
      if (strings.length === value.length) out[key] = strings;
    }
  }
  return out;
}

/** Compact a check-runner log line + structured data into one string. */
export function formatCheckLog(
  message: string,
  data?: Record<string, unknown>,
): string {
  return data ? `${message} ${JSON.stringify(data)}` : message;
}

/**
 * Flatten runAllChecks output into SecurityFindings. Failures become
 * passed:false findings; passingResults become passed:true 'info' findings.
 * Evidence is preserved verbatim so any serviceId/findingKey carries through to
 * grouping and reconciliation.
 */
export function gcpCheckResultsToFindings(
  result: RunAllChecksResult,
): SecurityFinding[] {
  const now = new Date().toISOString();
  const findings: SecurityFinding[] = [];
  for (const checkResult of result.results) {
    for (const finding of checkResult.result.findings) {
      findings.push({
        id: `${checkResult.checkId}:${finding.resourceId}`,
        title: finding.title,
        description: finding.description,
        severity: finding.severity,
        resourceType: finding.resourceType,
        resourceId: finding.resourceId,
        remediation: finding.remediation,
        evidence: finding.evidence ?? {},
        createdAt: now,
        passed: false,
      });
    }
    for (const passing of checkResult.result.passingResults) {
      findings.push({
        id: `${checkResult.checkId}:${passing.resourceId}`,
        title: passing.title,
        description: passing.description,
        severity: 'info',
        resourceType: passing.resourceType,
        resourceId: passing.resourceId,
        evidence: passing.evidence ?? {},
        createdAt: now,
        passed: true,
      });
    }
  }
  return findings;
}
