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
  'password',
  'secret',
  'token',
  'credential',
  'credentials',
  'privatekey',
  'publickey',
  'accesskey',
  'accesskeyid',
  'secretaccesskey',
  'apikey',
  'signingkey',
  'sessionid',
  'sessiontoken',
  'bearer',
  'authorization',
  'cookie',
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function keyIsSensitive(key: string): boolean {
  const normalized = key.toLowerCase();
  return SENSITIVE_SUFFIXES.some((suffix) => normalized.endsWith(suffix));
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
    const shouldRedact =
      keyIsSensitive(key) && (typeof child === 'string' || isRecord(child));
    result[key] = shouldRedact ? REDACTED_VALUE : sanitizeEvidence(child);
  }
  return result;
}
