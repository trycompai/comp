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
  it('counts each kind and lists them grammatically', () => {
    const heading = buildCitationsHeading([
      ctrl('CC1.1', 'Awareness'),
      ctrl('CC6.1', 'MFA'),
      ctrl('CC7.2', 'Logging'),
      tsk('Quarterly review'),
      pol('Acceptable Use'),
    ]);
    expect(heading).toBe(
      'This plan addresses the risk through 3 controls, 1 task, and 1 policy:',
    );
  });

  it('singularizes correctly', () => {
    const heading = buildCitationsHeading([ctrl('CC1.1', 'X'), tsk('Y')]);
    expect(heading).toBe('This plan addresses the risk through 1 control and 1 task:');
  });

  it('omits kinds with zero count', () => {
    const heading = buildCitationsHeading([
      ctrl('CC1.1', 'X'),
      ctrl('CC1.2', 'Y'),
    ]);
    expect(heading).toBe('This plan addresses the risk through 2 controls:');
  });

  it('mentions gaps with the "recommended" qualifier', () => {
    const heading = buildCitationsHeading([
      ctrl('CC1.1', 'X'),
      gap('technical'),
      gap('compliance'),
    ]);
    expect(heading).toBe(
      'This plan addresses the risk through 1 control and 2 recommended gaps:',
    );
  });

  it('falls back to a generic intro when every citation is a gap', () => {
    const heading = buildCitationsHeading([gap('technical'), gap('technical')]);
    expect(heading).toBe(
      'This plan addresses the risk through 2 recommended gaps:',
    );
  });

  it('handles the empty case', () => {
    expect(buildCitationsHeading([])).toBe('This plan addresses the risk:');
  });

  it('pluralizes "policy" → "policies" correctly', () => {
    const heading = buildCitationsHeading([pol('A'), pol('B'), pol('C')]);
    expect(heading).toBe(
      'This plan addresses the risk through 3 policies:',
    );
  });
});
