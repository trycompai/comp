import type {
  EvidenceLevel,
  PentestCheck,
  ScanDepth,
} from '@/lib/security/penetration-tests-client';

export type ScanProfileId = 'quick' | 'standard' | 'deep';
export type EffectiveScanMode = ScanProfileId | 'custom';

export interface ScanProfileDefaults {
  scanDepth: ScanDepth;
  evidenceLevel: EvidenceLevel;
  checks: PentestCheck[];
}

export const allPentestChecks: PentestCheck[] = [
  'discovery',
  'secrets_info_disclosure',
  'technology_config',
  'xss',
  'injection',
  'authentication',
  'authorization',
  'idor_bola',
  'ssrf_xxe',
  'csrf',
  'race_conditions',
  'business_logic',
];

export const scanProfiles: Record<ScanProfileId, ScanProfileDefaults> = {
  quick: {
    scanDepth: 'quick',
    evidenceLevel: 'report_only',
    checks: ['discovery', 'secrets_info_disclosure', 'technology_config'],
  },
  standard: {
    scanDepth: 'standard',
    evidenceLevel: 'safe_proof',
    checks: allPentestChecks.filter(
      (check) => check !== 'race_conditions' && check !== 'business_logic',
    ),
  },
  deep: {
    scanDepth: 'deep',
    evidenceLevel: 'impact_proof',
    checks: allPentestChecks,
  },
};

export const checkLabels: Record<PentestCheck, string> = {
  discovery: 'Discovery',
  secrets_info_disclosure: 'Secrets & info disclosure',
  technology_config: 'Technology config',
  xss: 'XSS',
  injection: 'Injection',
  authentication: 'Authentication',
  authorization: 'Authorization',
  idor_bola: 'IDOR / BOLA',
  ssrf_xxe: 'SSRF / XXE',
  csrf: 'CSRF',
  race_conditions: 'Race conditions',
  business_logic: 'Business logic',
};

export const checkDescriptions: Record<PentestCheck, string> = {
  discovery: 'Maps the target attack surface — endpoints, subdomains, and exposed services.',
  secrets_info_disclosure:
    'Looks for leaked API keys, tokens, debug output, and exposed files like .git or .env.',
  technology_config:
    'Checks for missing security headers, outdated libraries, and exposed admin panels.',
  xss: 'Cross-site scripting — reflected, stored, and DOM-based variants.',
  injection: 'SQL, NoSQL, command, and LDAP injection in user-controlled inputs.',
  authentication:
    'Login flow weaknesses, weak password policies, and broken session handling.',
  authorization: 'Privilege escalation and missing access controls between roles.',
  idor_bola:
    'Insecure Direct Object References — whether one user can access another user\'s data by changing an ID.',
  ssrf_xxe: 'Server-side request forgery and XML external-entity attacks.',
  csrf: 'Cross-site request forgery — actions performed without user consent.',
  race_conditions:
    'Concurrency bugs like double-spend and time-of-check vs time-of-use issues.',
  business_logic: 'App-specific workflow abuse (e.g., skipping payment or approval steps).',
};

export const evidenceLabels: Record<EvidenceLevel, string> = {
  report_only: 'Report only',
  safe_proof: 'Safe proof',
  impact_proof: 'Impact proof',
};

export const evidenceDescriptions: Record<EvidenceLevel, string> = {
  report_only:
    'Findings are reported without exploitation. No active attack attempted. Fastest and safest — some findings may need manual confirmation.',
  safe_proof:
    'Findings are validated with non-destructive proofs. Safe for production and staging. Recommended default.',
  impact_proof:
    'Findings are validated with active exploitation attempts (no data destruction). May trigger WAF alerts or rate limits. Use on staging or with explicit owner approval.',
};

const checkWeights: Record<PentestCheck, number> = {
  discovery: 5,
  secrets_info_disclosure: 5,
  technology_config: 5,
  xss: 10,
  injection: 15,
  authentication: 15,
  authorization: 15,
  idor_bola: 15,
  ssrf_xxe: 10,
  csrf: 10,
  race_conditions: 35,
  business_logic: 45,
};

const evidenceMultipliers: Record<EvidenceLevel, number> = {
  report_only: 0.65,
  safe_proof: 1,
  impact_proof: 1.75,
};

export function resolveEffectiveScanMode(params: {
  evidenceLevel: EvidenceLevel;
  checks: PentestCheck[];
}): EffectiveScanMode {
  for (const profile of scanProfileOrder) {
    const defaults = scanProfiles[profile];
    if (
      params.evidenceLevel === defaults.evidenceLevel &&
      haveSameChecks(params.checks, defaults.checks)
    ) {
      return profile;
    }
  }

  return 'custom';
}

const scanProfileOrder: ScanProfileId[] = ['quick', 'standard', 'deep'];

export function estimateRuntime(params: {
  effectiveMode: EffectiveScanMode;
  evidenceLevel: EvidenceLevel;
  checks: PentestCheck[];
}): string {
  if (params.effectiveMode === 'quick') return '5-15 min';
  if (params.effectiveMode === 'standard') return '30-90 min';
  if (params.effectiveMode === 'deep') return '2-8+ hours';

  const total =
    params.checks.reduce((sum, check) => sum + checkWeights[check], 0) *
    evidenceMultipliers[params.evidenceLevel];
  const min = Math.max(5, Math.floor(total * 0.7));
  const max = Math.max(min, Math.ceil(total * 1.5));

  return `${formatRuntimeMinutes(min)}-${formatRuntimeMinutes(max)}`;
}

export function withRequiredDiscovery(checks: PentestCheck[]): PentestCheck[] {
  const uniqueChecks = allPentestChecks.filter((check) => checks.includes(check));
  const needsDiscovery = uniqueChecks.some((check) => check !== 'discovery');

  if (!needsDiscovery || uniqueChecks.includes('discovery')) {
    return uniqueChecks;
  }

  return ['discovery', ...uniqueChecks];
}

function haveSameChecks(left: PentestCheck[], right: PentestCheck[]): boolean {
  return left.length === right.length && left.every((check) => right.includes(check));
}

function formatRuntimeMinutes(minutes: number): string {
  if (minutes < 120) return `${minutes} min`;

  const hours = minutes / 60;
  if (Number.isInteger(hours)) return `${hours} hours`;

  return `${hours.toFixed(1)} hours`;
}
