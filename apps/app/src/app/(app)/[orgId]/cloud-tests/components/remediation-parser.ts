/**
 * GCP findings produce a remediation string with embedded sections —
 * a "More info: <url>" line and a "Compliance: <frameworks>" line are
 * appended to the raw SCC `nextSteps` text by the API. Rendering that
 * concatenated string verbatim looks like a wall of metadata. This
 * parser splits the string back into structured pieces so the UI can
 * present steps, reference link, and compliance frameworks distinctly.
 *
 * AWS / Azure remediations have no embedded sections — the parser
 * returns the input verbatim as `steps` with empty/null metadata.
 */

export interface ComplianceFramework {
  standard: string;
  version: string | null;
  ids: string[];
}

export interface ParsedRemediation {
  steps: string;
  referenceUrl: string | null;
  compliance: ComplianceFramework[];
}

/**
 * Returns the URL only if it parses as an absolute http/https URL.
 * Returns `null` for `javascript:`, `data:`, `vbscript:`, relative URLs,
 * or anything malformed — so callers can safely assign the result to an
 * `href` attribute without enabling script-URL execution.
 *
 * Today's source for remediation URLs is Google SCC's `externalUri`
 * field, but the parser is generic — defense in depth applies.
 */
export function safeHttpUrl(url: string | null): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.toString();
    }
    return null;
  } catch {
    return null;
  }
}

// Use prefixes without trailing whitespace so we match even after the
// section has been trimmed (an empty URL renders as "More info:" with
// no trailing space).
const COMPLIANCE_PREFIX = 'Compliance:';
const REFERENCE_PREFIX = 'More info:';

/**
 * Parses a remediation string built by the API into structured pieces.
 *
 * Input shape (GCP):
 *   "<nextSteps>\n\nMore info: <url>\n\nCompliance: cis 1.0 (5.6.7); pci 3.2.1 (1.2.1)"
 * The sections are appended in fixed order by `GCPSecurityService.buildRemediation`.
 * Either section is optional (older findings may omit one).
 */
export function parseRemediation(input: string): ParsedRemediation {
  const sections = input.split('\n\n').map((s) => s.trim());

  const stepLines: string[] = [];
  let referenceUrl: string | null = null;
  let complianceLine: string | null = null;

  for (const section of sections) {
    if (section.startsWith(REFERENCE_PREFIX)) {
      const candidate = section.slice(REFERENCE_PREFIX.length).trim();
      if (candidate.length > 0) {
        referenceUrl = candidate;
      }
      continue;
    }
    if (section.startsWith(COMPLIANCE_PREFIX)) {
      complianceLine = section.slice(COMPLIANCE_PREFIX.length).trim();
      continue;
    }
    if (section.length > 0) {
      stepLines.push(section);
    }
  }

  return {
    steps: stepLines.join('\n\n'),
    referenceUrl,
    compliance: complianceLine ? parseComplianceLine(complianceLine) : [],
  };
}

/**
 * Parses a line like:
 *   "cis 1.0 (5.6.7); pci 3.2.1 (1.2.1, 1.3.1); nist 800-53 (SC-7)"
 *
 * The format mirrors the join performed in
 * `GCPSecurityService.buildRemediation`:
 *   parts.push(`Compliance: ${standards.join('; ')}`)
 *   where each `standard` = `${c.standard} ${c.version} (${c.ids.join(', ')})`.
 *
 * Falls back gracefully on unexpected input — a malformed entry becomes
 * a framework with only `standard` populated, never throws.
 */
function parseComplianceLine(line: string): ComplianceFramework[] {
  const entries = line.split(/;\s*/).filter((p) => p.length > 0);
  const frameworks: ComplianceFramework[] = [];

  for (const entry of entries) {
    const match = entry.match(/^(.+?)\s+(\S+?)\s*\(([^)]+)\)\s*$/);
    if (match) {
      const [, standard, version, idsRaw] = match;
      frameworks.push({
        standard: standard.trim(),
        version: version.trim(),
        ids: idsRaw
          .split(/,\s*/)
          .map((s) => s.trim())
          .filter((s) => s.length > 0),
      });
      continue;
    }
    // No version/ids in parens — surface the raw label so we don't drop
    // a compliance reference we don't fully understand.
    frameworks.push({
      standard: entry.trim(),
      version: null,
      ids: [],
    });
  }

  return frameworks;
}
