import { describe, expect, it } from 'vitest';
import { buildCitationsHeading } from './build-citations-heading';
import type { MitigationCitation } from './select-mitigation-citations';

const ctrl = (code: string, name: string): MitigationCitation => ({
  kind: 'control',
  code,
  name,
});
const tsk = (name: string, status = 'todo'): MitigationCitation => ({
  kind: 'task',
  name,
  status,
});
const pol = (name: string): MitigationCitation => ({ kind: 'policy', name });
const gap = (controlTypeHint: string): MitigationCitation => ({
  kind: 'gap',
  controlTypeHint,
});

describe('buildCitationsHeading', () => {
  it('reports full linked totals (not citation counts) when work is linked', () => {
    const heading = buildCitationsHeading({
      citations: [
        ctrl('CC1.1', 'Awareness'),
        ctrl('CC6.1', 'MFA'),
        ctrl('CC7.2', 'Logging'),
        tsk('Quarterly review'),
        tsk('Annual audit'),
      ],
      linkedTotals: { controls: 6, tasks: 8 },
    });
    // 6 + 8 linked, but bullets only reference 3 controls + 2 tasks → highlights
    expect(heading).toBe(
      'This plan addresses the risk through 6 controls and 8 tasks. Highlights below:',
    );
  });

  it('omits the "Highlights" tail when bullets cover the full linked work', () => {
    const heading = buildCitationsHeading({
      citations: [ctrl('CC1.1', 'X'), ctrl('CC1.2', 'Y'), tsk('Z')],
      linkedTotals: { controls: 2, tasks: 1 },
    });
    expect(heading).toBe(
      'This plan addresses the risk through 2 controls and 1 task:',
    );
  });

  it('singularizes correctly', () => {
    const heading = buildCitationsHeading({
      citations: [ctrl('CC1.1', 'X'), tsk('Y')],
      linkedTotals: { controls: 1, tasks: 1 },
    });
    expect(heading).toBe('This plan addresses the risk through 1 control and 1 task:');
  });

  it('shows highlights when policies/gaps are present even at full coverage', () => {
    const heading = buildCitationsHeading({
      citations: [ctrl('CC1.1', 'X'), tsk('Y'), pol('Acceptable Use'), gap('compliance')],
      linkedTotals: { controls: 1, tasks: 1 },
    });
    expect(heading).toBe(
      'This plan addresses the risk through 1 control and 1 task. Highlights below:',
    );
  });

  it('falls back to citation kinds when no work is linked (only gaps)', () => {
    const heading = buildCitationsHeading({
      citations: [gap('technical'), gap('technical'), gap('compliance')],
      linkedTotals: { controls: 0, tasks: 0 },
    });
    expect(heading).toBe(
      'This plan addresses the risk through 3 recommended gaps:',
    );
  });

  it('falls back to citation kinds when no work is linked (mixed policies + gaps)', () => {
    const heading = buildCitationsHeading({
      citations: [pol('A'), pol('B'), gap('compliance')],
      linkedTotals: { controls: 0, tasks: 0 },
    });
    expect(heading).toBe(
      'This plan addresses the risk through 2 policies and 1 recommended gap:',
    );
  });

  it('handles the empty case', () => {
    expect(
      buildCitationsHeading({ citations: [], linkedTotals: { controls: 0, tasks: 0 } }),
    ).toBe('This plan addresses the risk:');
  });
});
