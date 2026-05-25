/**
 * Split a freeform string into ordered TEXT and JSON segments.
 *
 * Background: the AI-generated manual remediation steps frequently
 * embed IAM/bucket-policy JSON inside otherwise plain English. We
 * render JSON as a code block and the surrounding prose as text. The
 * previous implementation used a regex (`\{[^{}]*"(Version|Effect|
 * Statement)"[^{}]*(?:\{[^{}]*\}[^{}]*)*\}`) which only handles ONE
 * level of nesting — a bucket policy with both `Principal:{...}` and
 * `Condition:{StringEquals:{...}}` would split incorrectly, leaving
 * the outer wrapper and any deeper-nested statements as plain text.
 *
 * This helper does a proper brace-balanced scan instead:
 *  - Locate `{` or `[` (a JSON candidate start).
 *  - Walk forward counting braces, respecting string literals (so
 *    `"value with } inside"` doesn't fool us).
 *  - On balanced close, try `JSON.parse`. If valid, emit a json
 *    segment; if not, keep scanning as text.
 *
 * Pure function. No DOM, no React — easy to unit-test.
 */

export type Segment =
  | { type: 'text'; value: string }
  | { type: 'json'; raw: string; pretty: string };

const OPEN: Record<string, string> = { '{': '}', '[': ']' };

/**
 * Try to find the index of the matching closing bracket for the
 * opener at `start`. Returns the index of the closer, or null if the
 * string is unbalanced before the end.
 *
 * Handles:
 *  - nested objects + arrays at arbitrary depth
 *  - string literals with `\"` escapes (so braces inside strings
 *    don't affect depth counting)
 */
export function findBalancedEnd(
  text: string,
  start: number,
): number | null {
  const openCh = text[start];
  if (openCh !== '{' && openCh !== '[') return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (c === '\\') {
      // Only meaningful inside strings, but cheap to track unconditionally.
      escaped = true;
      continue;
    }
    if (c === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (c === '{' || c === '[') depth++;
    else if (c === '}' || c === ']') {
      depth--;
      if (depth === 0) return i;
      if (depth < 0) return null;
    }
  }
  return null;
}

/**
 * Walk a freeform string and return ordered segments. Text between
 * JSON blocks is emitted verbatim; JSON blocks are validated via
 * `JSON.parse` before being classified as such — invalid candidates
 * fall through to text so we don't render garbage as a "code block".
 *
 * Top-level non-object/array values (numbers, strings, bare nulls)
 * are intentionally left as text; they don't benefit from code-block
 * formatting.
 */
export function extractJsonSegments(text: string): Segment[] {
  const segments: Segment[] = [];
  let buffer = '';
  let i = 0;

  while (i < text.length) {
    const ch = text[i];
    if (ch === '{' || ch === '[') {
      const end = findBalancedEnd(text, i);
      if (end !== null) {
        const raw = text.slice(i, end + 1);
        try {
          const parsed: unknown = JSON.parse(raw);
          if (
            parsed !== null &&
            (typeof parsed === 'object' || Array.isArray(parsed))
          ) {
            if (buffer.length > 0) {
              segments.push({ type: 'text', value: buffer });
              buffer = '';
            }
            segments.push({
              type: 'json',
              raw,
              pretty: JSON.stringify(parsed, null, 2),
            });
            i = end + 1;
            continue;
          }
        } catch {
          // Not valid JSON despite balanced braces — treat as text.
        }
      }
    }
    buffer += ch;
    i++;
  }

  if (buffer.length > 0) {
    segments.push({ type: 'text', value: buffer });
  }
  return segments;
}
