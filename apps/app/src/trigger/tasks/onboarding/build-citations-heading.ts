import type { MitigationCitation } from './select-mitigation-citations';

/**
 * Builds the intro sentence above the citation bullets in a treatment plan.
 * Counts each citation kind and lists them grammatically (Intl.ListFormat)
 * so the prose always matches the bullets that follow — e.g.
 * "through 3 controls, 1 task, and 1 recommended gap" reflects exactly
 * what's rendered below it.
 *
 * Pure function; lives in its own file so unit tests don't need to load
 * the DB client (which `onboard-organization-helpers.ts` imports at the
 * top level).
 */
export function buildCitationsHeading(citations: MitigationCitation[]): string {
  const counts = citations.reduce<Record<MitigationCitation['kind'], number>>(
    (acc, c) => ({ ...acc, [c.kind]: (acc[c.kind] ?? 0) + 1 }),
    { control: 0, task: 0, policy: 0, gap: 0 },
  );
  const parts: string[] = [];
  if (counts.control > 0) {
    parts.push(`${counts.control} ${counts.control === 1 ? 'control' : 'controls'}`);
  }
  if (counts.task > 0) {
    parts.push(`${counts.task} ${counts.task === 1 ? 'task' : 'tasks'}`);
  }
  if (counts.policy > 0) {
    parts.push(`${counts.policy} ${counts.policy === 1 ? 'policy' : 'policies'}`);
  }
  if (counts.gap > 0) {
    parts.push(
      `${counts.gap} recommended ${counts.gap === 1 ? 'gap' : 'gaps'}`,
    );
  }
  if (parts.length === 0) {
    return 'This plan addresses the risk:';
  }
  const formatter = new Intl.ListFormat('en', { style: 'long', type: 'conjunction' });
  return `This plan addresses the risk through ${formatter.format(parts)}:`;
}
