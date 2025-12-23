export type OrgFramework = {
  id: string;
  name: string;
  version: string;
  description: string;
};

type FrameworkRule = {
  /**
   * Regex is matched against normalized `name + description` for the framework.
   * Centralizing matching here keeps the rest of the code framework-agnostic.
   */
  match: RegExp;
  checks: string[];
};

const FRAMEWORK_RULES: FrameworkRule[] = [
  {
    match: /\bsoc\s*2\b/i,
    checks: ['Review their SOC 2 report (Type I / Type II) and note any exceptions.'],
  },
  {
    match: /\biso\s*27001\b/i,
    checks: ['Review their ISO 27001 certificate and scope/SoA (if available).'],
  },
  {
    match: /\bgdpr\b/i,
    checks: ['Check for a DPA (Data Processing Agreement) and confirm GDPR commitments.'],
  },
  {
    match: /\bhipaa\b/i,
    checks: ['If PHI is involved, confirm whether they offer a BAA and required safeguards.'],
  },
  {
    match: /\bpci\b|\bpci\s*dss\b/i,
    checks: ['If payment data is involved, confirm PCI DSS compliance / attestation.'],
  },
];

const DEFAULT_FRAMEWORKS: OrgFramework[] = [
  {
    id: 'default_soc2',
    name: 'SOC 2',
    version: 'Latest',
    description: 'Service Organization Control 2 (Trust Services Criteria)',
  },
  {
    id: 'default_iso42001',
    name: 'ISO 27001',
    version: 'Latest',
    description: 'AI management / security standard',
  },
];

export function buildFrameworkChecklist(frameworks: OrgFramework[]): string[] {
  if (frameworks.length === 0) return [];

  const normalizedSources = frameworks.map((f) =>
    `${f.name} ${f.description ?? ''}`.trim().toLowerCase(),
  );

  const checks = new Set<string>();

  for (const source of normalizedSources) {
    for (const rule of FRAMEWORK_RULES) {
      if (!rule.match.test(source)) continue;
      for (const check of rule.checks) checks.add(check);
    }
  }

  // Generic fallback if the org uses frameworks we don't explicitly recognize
  if (checks.size === 0) {
    const frameworkList = frameworks
      .map((f) => f.name)
      .filter(Boolean)
      .join(', ');
    if (frameworkList) {
      return [`Review vendor documentation relevant to your frameworks: ${frameworkList}.`];
    }
  }

  return Array.from(checks);
}

export function getDefaultFrameworks(): OrgFramework[] {
  return DEFAULT_FRAMEWORKS;
}