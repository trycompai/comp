/**
 * Best-effort scrubbing of secrets/PII from free text BEFORE it is used for
 * failure classification, logged, or stored (e.g. in a check's error evidence or
 * a Linear ticket). The self-heal layer must never leak credentials.
 *
 * Conservative by design: over-redacting error text is harmless (the classifier
 * keys off words like "scoped to" / status codes, not token values), whereas
 * under-redacting could leak a secret. Returns a string safe to persist/show.
 */

const PATTERNS: Array<[RegExp, string]> = [
  // Authorization headers / bearer + basic tokens
  [/\b(bearer|basic)\s+[A-Za-z0-9._+/=-]+/gi, '$1 [redacted]'],
  // Sensitive key/value pairs in any shape — incl. quoted JSON keys/values
  // (`"client_secret": "x"`, `{"pwd":"x"}`) which the first-token form missed.
  [
    /(["']?\b(?:authorization|x-api-key|api[_-]?key|client[_-]?secret|access[_-]?token|refresh[_-]?token|password|passwd|pwd|secret|token)\b["']?\s*[:=]\s*)(["']?)[^\s"',}]+\2/gi,
    '$1[redacted]',
  ],
  // Common provider key prefixes (sk-, lin_api_, ghp_, xoxb-, AKIA…, etc.)
  [/\b(sk|pk|rk)-[A-Za-z0-9]{6,}/g, '[redacted]'],
  [
    /\b(lin_api_|ghp_|gho_|ghs_|github_pat_|xox[baprs]-|glpat-|AKIA|ASIA)[A-Za-z0-9_-]{6,}/g,
    '[redacted]',
  ],
  // JWTs (three base64url segments)
  [/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[redacted]'],
  // Email addresses (PII)
  [/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, '[redacted-email]'],
  // Long opaque tokens (>=24 chars of token-ish characters)
  [/\b[A-Za-z0-9_-]{24,}\b/g, '[redacted]'],
];

export function redactSecrets(input: string | null | undefined): string {
  if (!input) return '';
  let out = String(input);
  for (const [re, repl] of PATTERNS) {
    out = out.replace(re, repl);
  }
  return out;
}
