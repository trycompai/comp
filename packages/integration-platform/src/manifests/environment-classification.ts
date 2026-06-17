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
 *
 * Qualifiers are honored: a production keyword that is negated ("non-prod",
 * "not-prod", or the joined "nonprod") classifies as NON-PRODUCTION, and a
 * pre-production keyword ("pre-prod", matching the joined "preprod") classifies
 * as STAGING — never as plain production. Without this a `non-prod` label would
 * read as production and corrupt the prod-vs-non-prod separation verdict.
 */

/** Production keywords — defined once so the qualifier pass below can reuse them. */
const PRODUCTION_TOKENS: ReadonlySet<string> = new Set([
  'prod',
  'production',
  'prd',
  'live',
]);

const ENV_TOKEN_SETS: ReadonlyArray<{ env: string; tokens: ReadonlySet<string> }> = [
  // Production is first so it wins ties when a string carries multiple tokens.
  { env: 'production', tokens: PRODUCTION_TOKENS },
  { env: 'staging', tokens: new Set(['staging', 'stage', 'stg', 'preprod', 'uat']) },
  { env: 'development', tokens: new Set(['dev', 'develop', 'development']) },
  { env: 'test', tokens: new Set(['test', 'testing', 'qa']) },
  { env: 'sandbox', tokens: new Set(['sandbox', 'sbx', 'demo']) },
];

/** Default tag/label keys that conventionally carry the environment. */
export const ENV_TAG_KEYS = ['environment', 'env', 'stage', 'tier'] as const;

/** The single production bucket; every other bucket is non-production. */
const PRODUCTION_ENV = 'production';

/** The staging bucket — also where pre-production ("pre-prod") classifies. */
const STAGING_ENV = 'staging';

/**
 * Canonical bucket for an explicitly non-production label ("non-prod",
 * "nonprod"). It says only "not production" — which is exactly what the
 * separation control needs: it counts as a non-production environment.
 */
const NON_PRODUCTION_ENV = 'non-production';

/**
 * Joined non-production spellings: the qualifier and production word run
 * together with no separator ("nonprod"), so they survive `tokenize` as a single
 * token and are matched whole. Separated forms ("non-prod") are caught by the
 * adjacency check in `classifyTokens`.
 */
const NON_PRODUCTION_TOKENS: ReadonlySet<string> = new Set([
  'nonprod',
  'nonprd',
  'nonproduction',
  'notprod',
  'notprd',
  'notproduction',
]);

/**
 * Qualifier tokens checked against the token IMMEDIATELY before a production
 * token. Only production is qualified — it's the one bucket where a missed
 * qualifier flips the prod-vs-non-prod verdict — so a stray "non"/"pre"
 * elsewhere in a name is ignored.
 */
const PRODUCTION_NEGATORS: ReadonlySet<string> = new Set(['non', 'not']);
const PREPROD_QUALIFIERS: ReadonlySet<string> = new Set(['pre']);

/**
 * Whether a set of detected environments confirms environment SEPARATION as the
 * control intends: production must be present AND at least one non-production
 * environment (staging/development/test/sandbox). Two non-production
 * environments alone (e.g. dev + staging) do NOT demonstrate that production is
 * segregated, so they must not pass.
 */
export function confirmsEnvironmentSeparation(
  envs: ReadonlyArray<string>,
): boolean {
  return (
    envs.includes(PRODUCTION_ENV) && envs.some((e) => e !== PRODUCTION_ENV)
  );
}

/** Split on any run of non-alphanumeric chars; lowercased, empties removed. */
function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 0);
}

/**
 * Classify a single tokenized candidate, or null. A qualified production token
 * is resolved FIRST — "non-prod"/"not-prod" (and the joined "nonprod") →
 * non-production, "pre-prod" → staging — so the bare production keyword below
 * can't win it back. Otherwise tokens are matched exactly against each
 * environment set (production first, so it wins when several tokens are present).
 */
function classifyTokens(tokens: string[]): string | null {
  let prev: string | undefined;
  for (const token of tokens) {
    if (NON_PRODUCTION_TOKENS.has(token)) return NON_PRODUCTION_ENV;
    if (PRODUCTION_TOKENS.has(token) && prev) {
      if (PRODUCTION_NEGATORS.has(prev)) return NON_PRODUCTION_ENV;
      if (PREPROD_QUALIFIERS.has(prev)) return STAGING_ENV;
    }
    prev = token;
  }
  for (const { env, tokens: keywords } of ENV_TOKEN_SETS) {
    if (tokens.some((t) => keywords.has(t))) return env;
  }
  return null;
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
    const env = classifyTokens(tokenize(candidate));
    if (env) return env;
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
