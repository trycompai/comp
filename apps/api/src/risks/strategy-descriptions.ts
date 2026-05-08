import { RiskTreatmentType } from '@db';

interface EntityWithStrategy {
  treatmentStrategy: RiskTreatmentType;
  treatmentStrategyDescription: string | null;
  strategyDescriptions: unknown;
}

interface UpdateInput {
  treatmentStrategy?: RiskTreatmentType;
  treatmentStrategyDescription?: string | null;
}

export interface ResolvedStrategyUpdate {
  treatmentStrategy?: RiskTreatmentType;
  treatmentStrategyDescription?: string | null;
  strategyDescriptions?: Record<string, string>;
}

/**
 * Computes the data fields that need to be persisted when an update touches
 * `treatmentStrategy` and/or `treatmentStrategyDescription`. The logic keeps
 * each strategy's description independent in the `strategyDescriptions` JSON
 * column so a Mitigate plan, an Accept rationale, and a Transfer rationale
 * can coexist on the same risk/vendor.
 *
 * Cases:
 * - Strategy changes → save the current description into the OLD strategy
 *   slot, then load the NEW strategy's saved text (if any) back into the
 *   active `treatmentStrategyDescription`.
 * - Description changes (no strategy change) → mirror it into the active
 *   strategy's slot in `strategyDescriptions`.
 * - Both change → strategy swap runs first; explicit description in the
 *   update wins as the new active text and is mirrored into the new
 *   strategy's slot.
 */
export function resolveStrategyDescriptionUpdate(
  existing: EntityWithStrategy,
  update: UpdateInput,
): ResolvedStrategyUpdate {
  if (
    update.treatmentStrategy === undefined &&
    update.treatmentStrategyDescription === undefined
  ) {
    return {};
  }

  const map = parseStrategyMap(existing.strategyDescriptions);
  const oldStrategy = existing.treatmentStrategy;
  const newStrategy = update.treatmentStrategy ?? oldStrategy;
  const isStrategyChange =
    update.treatmentStrategy !== undefined && update.treatmentStrategy !== oldStrategy;

  const result: ResolvedStrategyUpdate = {};

  if (isStrategyChange) {
    if ((existing.treatmentStrategyDescription ?? '').length > 0) {
      map[oldStrategy] = existing.treatmentStrategyDescription as string;
    } else {
      delete map[oldStrategy];
    }
    result.treatmentStrategy = newStrategy;
    if (update.treatmentStrategyDescription === undefined) {
      result.treatmentStrategyDescription = map[newStrategy] ?? null;
    }
  }

  if (update.treatmentStrategyDescription !== undefined) {
    const next = update.treatmentStrategyDescription ?? '';
    if (next.length > 0) {
      map[newStrategy] = next;
    } else {
      delete map[newStrategy];
    }
    result.treatmentStrategyDescription = update.treatmentStrategyDescription;
  }

  result.strategyDescriptions = map;
  return result;
}

function parseStrategyMap(raw: unknown): Record<string, string> {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
      if (typeof v === 'string' && v.length > 0) out[k] = v;
    }
    return out;
  }
  return {};
}
