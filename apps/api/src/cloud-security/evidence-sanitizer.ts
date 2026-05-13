/**
 * Redacts sensitive values inside cloud-test evidence payloads before they
 * are rendered to a user.
 *
 * Matching strategy — case-insensitive suffix match on the KEY name. A key
 * is considered sensitive when its lowercase form ends with one of the
 * SENSITIVE_SUFFIXES. This deliberately differs from substring matching:
 * `passwordPolicy` and `requirePassword` keep their structure visible
 * because their suffix is `policy`/`Password` respectively — only literal
 * `password`, `userPassword`, etc. get redacted.
 *
 * Redaction rule — only string and nested-object values are redacted.
 * Booleans and numbers under a sensitive key are preserved (e.g. config
 * flags like `requirePassword: true` should stay visible to auditors).
 *
 * Add new entries to SENSITIVE_SUFFIXES as new sensitive field names are
 * observed in real provider payloads. Removing an entry is a security
 * regression — review carefully.
 */

export const REDACTED_VALUE = '[REDACTED]';

const SENSITIVE_SUFFIXES: readonly string[] = [
  // singular + plural pairs — plurals can appear in arrays
  // (e.g. `tokens: [...]`, `secrets: [...]`)
  'password',
  'passwords',
  'secret',
  'secrets',
  'token',
  'tokens',
  'credential',
  'credentials',
  'privatekey',
  'privatekeys',
  'publickey',
  'publickeys',
  'accesskey',
  'accesskeys',
  'accesskeyid',
  'secretaccesskey',
  'apikey',
  'apikeys',
  'signingkey',
  'signingkeys',
  'sessionid',
  'sessiontoken',
  'sessiontokens',
  'bearer',
  'authorization',
  'cookie',
  'cookies',
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function keyIsSensitive(key: string): boolean {
  // Strip underscores, hyphens, dots, and whitespace so suffix matching
  // catches snake_case (`access_key_id`), kebab-case (`access-key-id`),
  // and human-formatted (`access key id`) variants alongside camelCase.
  const normalized = key.toLowerCase().replace(/[\s._-]/g, '');
  return SENSITIVE_SUFFIXES.some((suffix) => normalized.endsWith(suffix));
}

/**
 * Replace every string / object / nested-array element of an array with
 * REDACTED. Arrays under sensitive keys (e.g. `tokens: ["t1","t2"]`,
 * `accessKeys: [{...}]`, or even `secrets: [["a","b"], ["c"]]`) need their
 * values scrubbed but their length preserved. Booleans and numbers stay
 * visible to match how the parent record handles them under sensitive
 * keys.
 */
function redactArray(value: unknown[]): unknown[] {
  return value.map((item) => {
    if (typeof item === 'string') return REDACTED_VALUE;
    if (isRecord(item)) return REDACTED_VALUE;
    // Recurse into nested arrays so secrets inside `[[...], [...]]` are
    // scrubbed too — without this, nested arrays passed through unchanged.
    if (Array.isArray(item)) return redactArray(item);
    return item;
  });
}

/**
 * Recursively walks a JSON-like value and replaces values under sensitive
 * keys with REDACTED_VALUE. Structure (keys, arrays, primitive types) is
 * preserved so callers and auditors can still see what fields exist.
 *
 * Pure — does not mutate the input.
 */
export function sanitizeEvidence(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map(sanitizeEvidence);
  if (!isRecord(value)) return value;

  const result: Record<string, unknown> = {};
  for (const key of Object.keys(value)) {
    const child = value[key];
    if (keyIsSensitive(key)) {
      if (typeof child === 'string' || isRecord(child)) {
        result[key] = REDACTED_VALUE;
      } else if (Array.isArray(child)) {
        result[key] = redactArray(child);
      } else {
        // Booleans / numbers under a sensitive key stay visible — they're
        // typically config flags (e.g. `requirePassword: true`).
        result[key] = child;
      }
    } else {
      result[key] = sanitizeEvidence(child);
    }
  }
  return result;
}
