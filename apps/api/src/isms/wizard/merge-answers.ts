import type { PartialWizardAnswers } from './wizard-schema';

/**
 * Merge an incoming partial wizard payload onto the stored answers. Nested
 * objects (deputySpo, insurance, cloudScopeSplit, euRep) are shallow-merged so a
 * single-field PATCH does not clobber sibling fields; scalars and arrays are
 * replaced wholesale. Returns a new object — neither input is mutated.
 */
export function mergeWizardAnswers({
  stored,
  incoming,
}: {
  stored: PartialWizardAnswers;
  incoming: PartialWizardAnswers;
}): PartialWizardAnswers {
  const merged: PartialWizardAnswers = { ...stored };

  for (const key of Object.keys(incoming) as Array<keyof PartialWizardAnswers>) {
    const value = incoming[key];
    if (value === undefined) continue;

    if (isPlainObject(value)) {
      const current = merged[key];
      const base: Record<string, unknown> = isPlainObject(current)
        ? current
        : {};
      Object.assign(merged, { [key]: { ...base, ...value } });
      continue;
    }

    Object.assign(merged, { [key]: value });
  }

  return merged;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' && value !== null && !Array.isArray(value)
  );
}
