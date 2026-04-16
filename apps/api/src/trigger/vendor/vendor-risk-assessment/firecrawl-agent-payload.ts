/**
 * Helpers for extracting the actual structured payload out of a
 * Firecrawl Agent response. The SDK wraps data under `.data`, but across
 * versions it has shown up under `.output`, `.result`, or `.response` too.
 *
 * Because every field in `vendorRiskAssessmentAgentSchema` is optional,
 * parsing the outer wrapper object against the schema succeeds as an
 * empty `{}` — which would silently beat the populated inner `.data`
 * payload under a `.find(ok)` lookup. Callers must score candidates by
 * populated-field count and pick the best, not the first.
 */

export function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : null;
}

export function extractAgentPayloadCandidates(
  agentResponse: unknown,
): unknown[] {
  const candidates: unknown[] = [];
  const seen = new Set<unknown>();

  const visit = (value: unknown) => {
    if (value === undefined || seen.has(value)) return;
    seen.add(value);
    candidates.push(value);

    const record = asRecord(value);
    if (!record) return;

    for (const key of ['data', 'output', 'result', 'response']) {
      visit(record[key]);
    }
  };

  visit(agentResponse);
  return candidates;
}

/** Count fields on a parsed object that are present and non-trivially empty. */
export function countPopulatedAgentFields(parsed: unknown): number {
  if (!parsed || typeof parsed !== 'object') return 0;
  let count = 0;
  for (const value of Object.values(parsed as Record<string, unknown>)) {
    if (value === null || value === undefined) continue;
    if (Array.isArray(value) && value.length === 0) continue;
    if (
      typeof value === 'object' &&
      !Array.isArray(value) &&
      Object.keys(value as Record<string, unknown>).length === 0
    )
      continue;
    count += 1;
  }
  return count;
}
