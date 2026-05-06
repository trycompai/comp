import { RiskCategory } from '@db';
import { describe, expect, it } from 'vitest';
import {
  GAP_HINT_BY_RISK_CATEGORY,
  selectMitigationCitations,
} from './select-mitigation-citations';

const ctrl = (code: string, name: string) => ({ code, name });
const tsk = (name: string, status: string = 'todo') => ({ name, status });
const pol = (name: string) => ({ name });

describe('selectMitigationCitations', () => {
  it('always returns exactly 5 citations', () => {
    const cites = selectMitigationCitations({
      linkedControls: [],
      linkedTasks: [],
      policies: [],
      gapHint: 'governance',
    });
    expect(cites).toHaveLength(5);
    expect(cites.every((c) => c.kind === 'gap')).toBe(true);
  });

  it('prefers controls (up to 3) over tasks and policies', () => {
    const cites = selectMitigationCitations({
      linkedControls: [
        ctrl('cc1-1', 'A'),
        ctrl('cc1-2', 'B'),
        ctrl('cc1-3', 'C'),
        ctrl('cc1-4', 'D'),
      ],
      linkedTasks: [tsk('T1'), tsk('T2')],
      policies: [pol('P1'), pol('P2')],
      gapHint: 'governance',
    });
    expect(cites.filter((c) => c.kind === 'control')).toHaveLength(3);
    // Remaining 2 slots: tasks first, then policies if needed.
    expect(cites[3]).toMatchObject({ kind: 'task', name: 'T1' });
    expect(cites[4]).toMatchObject({ kind: 'task', name: 'T2' });
  });

  it('fills with tasks then policies then gaps', () => {
    const cites = selectMitigationCitations({
      linkedControls: [ctrl('cc1-1', 'A')],
      linkedTasks: [tsk('T1')],
      policies: [pol('P1')],
      gapHint: 'governance',
    });
    expect(cites.map((c) => c.kind)).toEqual([
      'control',
      'task',
      'policy',
      'gap',
      'gap',
    ]);
  });

  it('limits tasks to 2 even when many are available', () => {
    const cites = selectMitigationCitations({
      linkedControls: [],
      linkedTasks: [
        tsk('T1'),
        tsk('T2'),
        tsk('T3'),
        tsk('T4'),
        tsk('T5'),
      ],
      policies: [],
      gapHint: 'governance',
    });
    expect(cites.filter((c) => c.kind === 'task')).toHaveLength(2);
    expect(cites.filter((c) => c.kind === 'gap')).toHaveLength(3);
  });

  it('uses the right gap-type hint for each risk category', () => {
    const expectations: Array<[RiskCategory, string]> = [
      [RiskCategory.people, 'awareness'],
      [RiskCategory.technology, 'technical'],
      [RiskCategory.vendor_management, 'third-party'],
      [RiskCategory.fraud, 'governance'],
      [RiskCategory.regulatory, 'compliance'],
      [RiskCategory.operations, 'operational'],
      [RiskCategory.other, 'general'],
    ];
    for (const [category, expected] of expectations) {
      expect(GAP_HINT_BY_RISK_CATEGORY[category]).toBe(expected);
      const cites = selectMitigationCitations({
        linkedControls: [],
        linkedTasks: [],
        policies: [],
        gapHint: GAP_HINT_BY_RISK_CATEGORY[category],
      });
      expect(cites[0]).toMatchObject({ kind: 'gap', controlTypeHint: expected });
    }
  });

  it('preserves input order for controls, tasks, and policies', () => {
    const cites = selectMitigationCitations({
      linkedControls: [ctrl('z', 'Z'), ctrl('a', 'A')],
      linkedTasks: [tsk('Late'), tsk('Early')],
      policies: [pol('Last'), pol('First')],
      gapHint: 'governance',
    });
    expect(cites[0]).toMatchObject({ code: 'z' });
    expect(cites[1]).toMatchObject({ code: 'a' });
    expect(cites[2]).toMatchObject({ name: 'Late' });
    expect(cites[3]).toMatchObject({ name: 'Early' });
    expect(cites[4]).toMatchObject({ kind: 'policy', name: 'Last' });
  });
});
