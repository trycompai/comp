/**
 * Shared environment classification for "Separation of Environments" checks
 * across cloud manifests (GCP projects, AWS VPCs, Azure subscriptions/resource
 * groups). Kept here — alongside `http-read-failure` — because all three cloud
 * manifests need the identical, well-tested logic.
 *
 * Matching is TOKEN-EXACT, not substring: a candidate string is split on any
 * run of non-alphanumeric characters (`-`, `_`, `.`, `/`, spaces) and each
 * token is compared exactly to a set of environment keywords. This is why
 * "production"/"product" and "dev"/"developer" never collide, and why separator
 * style doesn't matter (`myapp-prod`, `myapp_prod`, `myapp.prod` all classify).
 */

const ENV_TOKEN_SETS: ReadonlyArray<{ env: string; tokens: ReadonlySet<string> }> = [
  // Production is first so it wins ties when a string carries multiple tokens.
  { env: 'production', tokens: new Set(['prod', 'production', 'prd', 'live']) },
  { env: 'staging', tokens: new Set(['staging', 'stage', 'stg', 'preprod', 'uat']) },
  { env: 'development', tokens: new Set(['dev', 'develop', 'development']) },
  { env: 'test', tokens: new Set(['test', 'testing', 'qa']) },
  { env: 'sandbox', tokens: new Set(['sandbox', 'sbx', 'demo']) },
];

/** Default tag/label keys that conventionally carry the environment. */
export const ENV_TAG_KEYS = ['environment', 'env', 'stage', 'tier'] as const;

/** Split on any run of non-alphanumeric chars; lowercased, empties removed. */
function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 0);
}

/**
 * Classify a list of candidate strings (e.g. an environment tag/label value,
 * then a resource name) into a canonical environment, or null if none match.
 * Candidates are tried in order, so callers should pass the most authoritative
 * source (explicit env tag/label value) before the resource name.
 */
export function classifyEnvironment(
  candidates: ReadonlyArray<string | undefined>,
): string | null {
  for (const candidate of candidates) {
    if (!candidate) continue;
    const tokens = tokenize(candidate);
    for (const { env, tokens: keywords } of ENV_TOKEN_SETS) {
      if (tokens.some((t) => keywords.has(t))) return env;
    }
  }
  return null;
}

/**
 * Extract the values of environment-indicating tag/label keys from a tag map.
 * Key matching is case-insensitive (Azure/AWS tag keys vary in casing). Only
 * the configured env keys are read — arbitrary tag values are deliberately NOT
 * scanned, so a stray `team=dev-team` tag can't fabricate an environment.
 */
export function envTagValues(
  tags: Record<string, string> | undefined,
  keys: ReadonlyArray<string> = ENV_TAG_KEYS,
): string[] {
  if (!tags) return [];
  // Iterate the configured keys in PRIORITY order (not the tag map's insertion
  // order) so a more authoritative key (`environment`) is returned before a
  // less authoritative one (`stage`) — `classifyEnvironment` trusts order.
  const normalized = new Map(
    Object.entries(tags).map(([k, v]) => [k.toLowerCase(), v]),
  );
  return keys
    .map((k) => normalized.get(k.toLowerCase()))
    .filter((v): v is string => typeof v === 'string' && v.length > 0);
}
