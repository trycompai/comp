import { RiskCategory } from '@db';

export type MitigationCitation =
  | { kind: 'control'; code: string; name: string }
  | { kind: 'task'; name: string; status: string }
  | { kind: 'policy'; name: string }
  | { kind: 'gap'; controlTypeHint: string };

interface SelectInput {
  linkedControls: Array<{ code: string; name: string }>;
  linkedTasks: Array<{ name: string; status: string }>;
  policies: Array<{ name: string }>;
  gapHint: string;
}

const TARGET = 5;
const MAX_CONTROLS = 3;
const MAX_TASKS = 2;

/**
 * Maps a RiskCategory to the type-of-control hint used when filling unmet
 * citation slots with `gap` entries. Vendors don't use this map — they pass
 * a fixed `'third-party'` gap hint at the call site.
 */
export const GAP_HINT_BY_RISK_CATEGORY: Record<RiskCategory, string> = {
  [RiskCategory.customer]: 'compliance',
  [RiskCategory.regulatory]: 'compliance',
  [RiskCategory.reporting]: 'compliance',
  [RiskCategory.fraud]: 'governance',
  [RiskCategory.governance]: 'governance',
  [RiskCategory.operations]: 'operational',
  [RiskCategory.resilience]: 'operational',
  [RiskCategory.people]: 'awareness',
  [RiskCategory.technology]: 'technical',
  [RiskCategory.vendor_management]: 'third-party',
  [RiskCategory.other]: 'general',
};

/**
 * Returns exactly 5 citations for a treatment plan, in priority order:
 *   1. Up to 3 linked controls (input order preserved).
 *   2. Up to 2 linked tasks (input order preserved).
 *   3. Policies until the 5 slots fill.
 *   4. `gap` fillers using the supplied `gapHint`.
 *
 * The selection is deterministic — the LLM is never asked which entities to
 * cite, only what prose to write for each one. This eliminates the
 * possibility of fabricated control codes / task names / policy names in the
 * generated treatment plan.
 */
export function selectMitigationCitations({
  linkedControls,
  linkedTasks,
  policies,
  gapHint,
}: SelectInput): MitigationCitation[] {
  const out: MitigationCitation[] = [];

  for (const c of linkedControls.slice(0, MAX_CONTROLS)) {
    if (out.length >= TARGET) break;
    out.push({ kind: 'control', code: c.code, name: c.name });
  }

  for (const t of linkedTasks.slice(0, MAX_TASKS)) {
    if (out.length >= TARGET) break;
    out.push({ kind: 'task', name: t.name, status: t.status });
  }

  for (const p of policies) {
    if (out.length >= TARGET) break;
    out.push({ kind: 'policy', name: p.name });
  }

  while (out.length < TARGET) {
    out.push({ kind: 'gap', controlTypeHint: gapHint });
  }

  return out;
}

/**
 * Deterministic suffix appended to the LLM-generated sentence to attribute
 * each bullet to the correct entity. Because this is plain string
 * concatenation, citations cannot drift from reality.
 */
export function citationSuffix(c: MitigationCitation): string {
  switch (c.kind) {
    case 'control':
      return ` (Control: ${c.code} ${c.name})`;
    case 'task':
      return ` (Task: ${c.name})`;
    case 'policy':
      return ` (Policy: ${c.name})`;
    case 'gap':
      return ` — gap: recommend adding ${c.controlTypeHint} control`;
  }
}
