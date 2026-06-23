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
