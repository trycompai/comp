import {
  GetFindingsCommand,
  SecurityHubClient,
  type GetFindingsCommandInput,
} from '@aws-sdk/client-securityhub';
import type { SecurityFinding } from '../../cloud-security.service';
import type { AwsCredentials, AwsServiceAdapter } from './aws-service-adapter';

/**
 * Maximum number of findings we pull from Security Hub per scan, across
 * all pages. Bounded to keep scan time + payload size predictable.
 */
const MAX_FINDINGS_PER_SCAN = 500;

/** Page size for the SecHub GetFindings API. */
const FINDINGS_PAGE_SIZE = 100;

/** Service ID that this adapter stamps onto each finding's evidence so
 * downstream code (UI banner, Fix dialog) can recognize SecHub-sourced
 * findings without inspecting the findingKey format. */
export const SECURITY_HUB_SERVICE_ID = 'security-hub';

/**
 * Reads findings from AWS Security Hub and maps them to our internal
 * SecurityFinding shape so the rest of the system (Fix pipeline,
 * History tab, compliance chips, UI) treats them like any other
 * adapter's finding.
 *
 * This adapter is only instantiated when a connection's `awsScanMode`
 * is `'security_hub'` — see `AWSSecurityService.scanViaSecurityHub`.
 * It is NOT registered in the main adapters array; mode mutual
 * exclusion is enforced by code structure, not runtime config.
 */
export class SecurityHubAdapter implements AwsServiceAdapter {
  readonly serviceId = SECURITY_HUB_SERVICE_ID;
  readonly isGlobal = false;

  async scan(params: {
    credentials: AwsCredentials;
    region: string;
  }): Promise<SecurityFinding[]> {
    const { credentials, region } = params;
    const client = new SecurityHubClient({ region, credentials });

    try {
      return await this.fetchFindings(client, region);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      // Returning [] is the agreed graceful path when SecHub isn't subscribed
      // or the role can't see findings — the cloud-security service surfaces
      // a clearer onboarding error elsewhere when this happens consistently.
      if (message.includes('not subscribed') || message.includes('AccessDenied')) {
        return [];
      }
      throw error;
    }
  }

  private async fetchFindings(
    client: SecurityHubClient,
    region: string,
  ): Promise<SecurityFinding[]> {
    const findings: SecurityFinding[] = [];

    const baseParams: GetFindingsCommandInput = {
      Filters: {
        WorkflowStatus: [
          { Value: 'NEW', Comparison: 'EQUALS' },
          { Value: 'NOTIFIED', Comparison: 'EQUALS' },
        ],
        RecordState: [{ Value: 'ACTIVE', Comparison: 'EQUALS' }],
      },
      MaxResults: FINDINGS_PAGE_SIZE,
    };

    let nextToken: string | undefined;
    do {
      const response = await client.send(
        new GetFindingsCommand({ ...baseParams, NextToken: nextToken }),
      );
      for (const finding of response.Findings ?? []) {
        if (findings.length >= MAX_FINDINGS_PER_SCAN) break;
        findings.push(mapSecurityHubFinding(finding, region));
      }
      nextToken = response.NextToken;
    } while (nextToken && findings.length < MAX_FINDINGS_PER_SCAN);

    return findings;
  }
}

/**
 * Minimal shape we read from the Security Hub API. We don't type the
 * full AWS response because we only consume a handful of fields and
 * they're all optional — the AWS SDK types this very loosely anyway.
 */
export interface SecurityHubRawFinding {
  Id?: string;
  Title?: string;
  Description?: string;
  Remediation?: {
    Recommendation?: { Text?: string; Url?: string };
  };
  Severity?: { Label?: string };
  Resources?: Array<{ Type?: string; Id?: string }>;
  AwsAccountId?: string;
  Region?: string;
  Compliance?: { Status?: string; RelatedRequirements?: string[] };
  GeneratorId?: string;
  CreatedAt?: string;
  UpdatedAt?: string;
}

const SEVERITY_BY_SECHUB_LABEL: Record<string, SecurityFinding['severity']> = {
  INFORMATIONAL: 'info',
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
};

/**
 * Maps a raw SecHub finding into our internal SecurityFinding shape.
 * Exported so the unit tests can exercise it directly without a live
 * AWS client.
 *
 * Key design choices:
 *   - `evidence.findingKey` makes the finding visible to the Fix
 *     pipeline (the frontend `canFixFinding` and the API ai-remediation
 *     flow both gate on this). Derived from the SecHub control ID so
 *     it's stable across scans of the same control.
 *   - `evidence.serviceId` lets the UI recognize SecHub-sourced
 *     findings without parsing the findingKey format.
 *   - `remediation` is built in the same `<text>\n\nMore info: <url>\n\n
 *     Compliance: <fwks>` format that GCP uses, so the existing
 *     `RemediationSection` + `remediation-parser` render reference link
 *     and compliance chips with zero frontend changes.
 */
export function mapSecurityHubFinding(
  finding: SecurityHubRawFinding,
  scanRegion: string,
): SecurityFinding {
  const region = finding.Region || scanRegion;
  const passed = finding.Compliance?.Status === 'PASSED';
  const title = `${finding.Title ?? 'Untitled Finding'} (${region})`;

  return {
    id: finding.Id ?? '',
    title,
    description: finding.Description ?? 'No description available',
    severity: SEVERITY_BY_SECHUB_LABEL[finding.Severity?.Label ?? ''] ?? 'medium',
    resourceType: finding.Resources?.[0]?.Type ?? 'unknown',
    resourceId: finding.Resources?.[0]?.Id ?? 'unknown',
    remediation: buildRemediationText(finding),
    evidence: {
      // Stamping serviceId here lets the UI banner + Fix dialog detect
      // SecHub findings without parsing findingKey strings.
      serviceId: SECURITY_HUB_SERVICE_ID,
      // findingKey is the contract the Fix pipeline reads (see
      // CloudTestsSection.canFixFinding and cloud-security-query.service
      // findingKey extraction). Stable across scans of the same control.
      findingKey: deriveFindingKey(finding.GeneratorId),
      awsAccountId: finding.AwsAccountId,
      region,
      complianceStatus: finding.Compliance?.Status,
      relatedRequirements: finding.Compliance?.RelatedRequirements ?? [],
      generatorId: finding.GeneratorId,
      updatedAt: finding.UpdatedAt,
    },
    createdAt: finding.CreatedAt ?? new Date().toISOString(),
    passed,
  };
}

/**
 * Produces a stable findingKey from a SecHub `GeneratorId` like
 * `aws-foundational-security-best-practices/v/1.0.0/EC2.13` or
 * `cis-aws-foundations-benchmark/v/1.2.0/1.1`.
 *
 * Strategy: combine the standard prefix (first segment) with the control
 * identifier (last segment) so distinct findings from different standards
 * never collide under the same key. The middle segments (version /
 * revision) are intentionally dropped — they shouldn't change a finding's
 * identity within a standard.
 *
 *   aws-foundational-security-best-practices/v/1.0.0/EC2.13
 *     → aws-securityhub-aws-foundational-security-best-practices-ec2.13
 *
 *   cis-aws-foundations-benchmark/v/1.2.0/1.1
 *     → aws-securityhub-cis-aws-foundations-benchmark-1.1
 *
 *   pci-dss/v/3.2.1/1.1
 *     → aws-securityhub-pci-dss-1.1   (no collision with the CIS 1.1 above)
 *
 * Falls back gracefully when the GeneratorId has no path structure or is
 * missing entirely — we ALWAYS produce a key because the Fix button gates
 * on its existence, and missing findingKey would silently disable Fix.
 */
export function deriveFindingKey(generatorId: string | undefined): string {
  if (!generatorId) return 'aws-securityhub-unknown';
  const trimmed = generatorId.trim();
  if (!trimmed) return 'aws-securityhub-unknown';

  const segments = trimmed.split('/').filter((s) => s.length > 0);
  if (segments.length === 0) return 'aws-securityhub-unknown';

  if (segments.length === 1) {
    // No path structure — sanitize the whole thing.
    const sanitized = sanitizeKeySegment(segments[0]);
    return `aws-securityhub-${sanitized || 'unknown'}`;
  }

  // Combine first segment (standard identifier — namespaces the key) with
  // the last segment (control identifier — uniquely identifies WHICH check
  // within that standard). This prevents collisions like CIS 1.1 ↔ PCI 1.1.
  const standard = sanitizeKeySegment(segments[0]);
  const control = sanitizeKeySegment(segments[segments.length - 1]);
  const combined = [standard, control].filter(Boolean).join('-');
  return `aws-securityhub-${combined || 'unknown'}`;
}

function sanitizeKeySegment(value: string): string {
  // Keep alphanumerics, dots, hyphens — drop anything that would make the
  // key awkward in URLs/logs. Collapse runs of separators.
  return value
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Builds the remediation string for a SecHub finding. Output format
 * matches `gcp-security.service.ts buildRemediation` exactly so the
 * existing parser (`remediation-parser.ts`) extracts the reference URL
 * and compliance chips with zero frontend changes:
 *
 *   <AWS-provided remediation text>
 *
 *   More info: <docs URL>
 *
 *   Compliance: nist 800-53 (AC-2); cis 1.2.0 (1.1)
 */
export function buildRemediationText(finding: SecurityHubRawFinding): string {
  const parts: string[] = [];

  const text = finding.Remediation?.Recommendation?.Text?.trim();
  if (text) parts.push(text);

  const url = finding.Remediation?.Recommendation?.Url?.trim();
  if (url) parts.push(`More info: ${url}`);

  const compliance = formatRelatedRequirements(
    finding.Compliance?.RelatedRequirements,
  );
  if (compliance) parts.push(`Compliance: ${compliance}`);

  return (
    parts.join('\n\n') ||
    'No remediation guidance was provided for this Security Hub finding.'
  );
}

/**
 * Converts SecHub's `RelatedRequirements` strings (e.g.
 *   ["NIST.800-53.r5 AC-2", "CIS AWS Foundations Benchmark v1.2.0 1.1"])
 * into the parser-compatible format used by GCP:
 *   "nist 800-53 (AC-2); cis 1.2.0 (1.1)"
 *
 * Returns '' when there are no related requirements (caller skips the
 * Compliance: prefix in that case). Each requirement parses into
 * "<standard> <version> (<control>)" — `remediation-parser.ts`
 * `parseComplianceLine` handles malformed entries gracefully if anything
 * here doesn't match the expected pattern.
 */
export function formatRelatedRequirements(
  requirements: string[] | undefined,
): string {
  if (!requirements || requirements.length === 0) return '';
  return requirements
    .map(formatSingleRequirement)
    .filter((s) => s.length > 0)
    .join('; ');
}

function formatSingleRequirement(requirement: string): string {
  const cleaned = requirement.trim();
  if (!cleaned) return '';

  // SecHub uses several formats; the most common are:
  //   "NIST.800-53.r5 AC-2"
  //   "CIS AWS Foundations Benchmark v1.2.0 1.1"
  //   "PCI DSS v3.2.1 8.2.3"
  //   "AWS Foundational Security Best Practices v1.0.0/EC2.2"
  // We try a few patterns then fall back to a sensible default so we
  // surface SOMETHING rather than drop a real compliance mapping.

  const standardMatch = cleaned.match(
    /^([A-Z][A-Z0-9 .]+?)(?:\s+v?([\d.]+(?:[a-z]\d*)?))?\s+([A-Za-z0-9.\-]+)$/,
  );
  if (standardMatch) {
    const [, rawStandard, version, control] = standardMatch;
    const standard = normalizeStandardName(rawStandard);
    const ver = version ?? 'unspecified';
    return `${standard} ${ver} (${control})`;
  }

  // Fallback — keep the raw string so we don't silently drop data.
  return cleaned;
}

function normalizeStandardName(value: string): string {
  // Compact common multi-word framework names so chips render cleanly.
  // ("PCI DSS" → "pci dss" via lowercase; the full "DSS" token stays
  // as-is intentionally — the parser handles whitespace-separated parts.)
  return value
    .toLowerCase()
    .replace(/aws foundations benchmark/g, '')
    .replace(/foundational security best practices/g, 'fsbp')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\.$/, '');
}
