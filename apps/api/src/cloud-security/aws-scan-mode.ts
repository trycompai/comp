/**
 * Determines which engine performs an AWS security scan for a given
 * connection. This is the single source of truth for scan-mode strings —
 * importers never spell the values themselves.
 *
 *   - 'comp_scanners' — run our service adapters directly against AWS
 *                       APIs (today's default; full Fix button support).
 *   - 'security_hub'  — call AWS Security Hub's GetFindings API and
 *                       surface whatever findings the customer's
 *                       Security Hub is configured to evaluate (CIS,
 *                       NIST 800-53, PCI, etc.).
 *
 * Persisted in two places:
 *   - `IntegrationConnection.metadata.awsScanMode` — the customer's
 *     current choice for the connection. Stored in `metadata` (not
 *     `variables`) because it's a non-secret display field that the
 *     frontend reads via the connection endpoint; mirrors `awsType`,
 *     `roleArn`, `regions` etc.
 *   - `IntegrationCheckRun.scanMode` — which engine produced this run.
 *     Read by reconciliation to diff like-for-like; findingKeys live
 *     in different namespaces across modes, so cross-mode diffs would
 *     produce false resolutions/regressions.
 */
export type AwsScanMode = 'comp_scanners' | 'security_hub';

/** Canonical list of valid scan modes. Exported so DTOs, validators,
 * and tests reference ONE array instead of duplicating the string
 * literals everywhere. If a new mode is added, only this file changes
 * and all importers automatically pick it up — that's the
 * "single source of truth" promise this module makes. */
export const AWS_SCAN_MODES = [
  'comp_scanners',
  'security_hub',
] as const satisfies readonly AwsScanMode[];

/** Default behavior for AWS connections with no scan-mode set (including
 * every pre-feature connection that already exists in production). */
export const DEFAULT_AWS_SCAN_MODE: AwsScanMode = 'comp_scanners';

/**
 * Coerces a value (typically from JSON variables) into a valid
 * AwsScanMode. Unknown / missing / wrong-typed values fall back to the
 * default. Use this everywhere instead of comparing strings inline.
 */
export function resolveAwsScanMode(value: unknown): AwsScanMode {
  return value === 'security_hub' ? 'security_hub' : DEFAULT_AWS_SCAN_MODE;
}

/** True when the value, if persisted, would represent a SecHub-mode
 * connection. Reads in one place — keeps `=== 'security_hub'` out of
 * callers. */
export function isSecurityHubMode(value: unknown): boolean {
  return resolveAwsScanMode(value) === 'security_hub';
}
