/**
 * Builds the `strategyDescriptions` JSON map after writing a new active
 * `treatmentStrategyDescription`. Keeps each strategy's saved text
 * independent so switching strategies doesn't lose prior content.
 *
 * Mirrored on the API side at `apps/api/src/risks/strategy-descriptions.ts`.
 */
export function mirrorActiveDescriptionIntoMap({
  strategy,
  description,
  current,
}: {
  strategy: string;
  description: string;
  current: unknown;
}): Record<string, string> {
  const map: Record<string, string> = {};
  if (current && typeof current === 'object' && !Array.isArray(current)) {
    for (const [k, v] of Object.entries(current as Record<string, unknown>)) {
      if (typeof v === 'string' && v.length > 0) map[k] = v;
    }
  }
  if (description.length > 0) {
    map[strategy] = description;
  } else {
    delete map[strategy];
  }
  return map;
}
