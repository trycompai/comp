import type { Control, Task } from '@db';
import { describe, expect, it } from 'vitest';
import {
  getControlProgressPercent,
  getControlStatus,
  getFrameworkAggregatePercent,
  getRequirementArtifactCounts,
  getRequirementCompliancePercent,
  getRequirementStatus,
  type EvidenceSubmissionInfo,
} from './control-compliance';

const SIX_MONTHS_MS = 6 * 30 * 24 * 60 * 60 * 1000;

function makeTask(overrides: Partial<Task & { controls: Control[] }> = {}) {
  return {
    id: overrides.id ?? 't1',
    title: 'Task',
    status: 'todo',
    controls: overrides.controls ?? [{ id: 'c1' } as Control],
    ...overrides,
  } as Task & { controls: Control[] };
}

describe('getControlStatus', () => {
  it('returns not_started when policies are draft, tasks are todo, and no documents submitted', () => {
    const status = getControlStatus(
      [{ status: 'draft' }],
      [makeTask({ status: 'todo' })],
      'c1',
      [],
      [],
    );
    expect(status).toBe('not_started');
  });

  it('returns completed when all policies published, tasks done, and no document types required', () => {
    const status = getControlStatus(
      [{ status: 'published' }],
      [makeTask({ status: 'done' })],
      'c1',
      [],
      [],
    );
    expect(status).toBe('completed');
  });

  it('returns in_progress when policies/tasks complete but a required document type has no submission', () => {
    const status = getControlStatus(
      [{ status: 'published' }],
      [makeTask({ status: 'done' })],
      'c1',
      [{ formType: 'access_control_policy' }],
      [],
    );
    expect(status).toBe('in_progress');
  });

  it('returns completed when policies/tasks complete and a required document was submitted within 6 months', () => {
    const recent = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const submissions: EvidenceSubmissionInfo[] = [
      { id: 'evs1', formType: 'access_control_policy', submittedAt: recent },
    ];
    const status = getControlStatus(
      [{ status: 'published' }],
      [makeTask({ status: 'done' })],
      'c1',
      [{ formType: 'access_control_policy' }],
      submissions,
    );
    expect(status).toBe('completed');
  });

  it('returns in_progress when policies/tasks complete but the only document submission is older than 6 months', () => {
    const stale = new Date(Date.now() - SIX_MONTHS_MS - 24 * 60 * 60 * 1000);
    const submissions: EvidenceSubmissionInfo[] = [
      { id: 'evs1', formType: 'access_control_policy', submittedAt: stale },
    ];
    const status = getControlStatus(
      [{ status: 'published' }],
      [makeTask({ status: 'done' })],
      'c1',
      [{ formType: 'access_control_policy' }],
      submissions,
    );
    expect(status).toBe('in_progress');
  });

  it('returns not_relevant when only linked documents are marked not relevant', () => {
    const status = getControlStatus(
      [],
      [],
      'c1',
      [{ formType: 'access_control_policy', isNotRelevant: true }],
      [],
    );
    expect(status).toBe('not_relevant');
  });
});

describe('getRequirementStatus', () => {
  it('returns "No Controls" when there are no controls mapped to the requirement', () => {
    expect(getRequirementStatus([])).toEqual({
      label: 'No Controls',
      variant: 'secondary',
    });
  });

  it('returns "Satisfied" when every control is completed', () => {
    expect(getRequirementStatus(['completed', 'completed'])).toEqual({
      label: 'Satisfied',
      variant: 'default',
    });
  });

  it('returns "Not Started" when every control is not_started', () => {
    expect(getRequirementStatus(['not_started', 'not_started'])).toEqual({
      label: 'Not Started',
      variant: 'destructive',
    });
  });

  it('returns "Not Relevant" when every control is not_relevant', () => {
    expect(getRequirementStatus(['not_relevant', 'not_relevant'])).toEqual({
      label: 'Not Relevant',
      variant: 'secondary',
    });
  });

  it('returns "In Progress" when at least one control is in_progress (even if none are completed)', () => {
    expect(getRequirementStatus(['in_progress', 'not_started'])).toEqual({
      label: 'In Progress',
      variant: 'secondary',
    });
  });

  it('returns "In Progress" when some controls are completed but not all', () => {
    expect(getRequirementStatus(['completed', 'not_started'])).toEqual({
      label: 'In Progress',
      variant: 'secondary',
    });
  });
});

describe('getControlProgressPercent', () => {
  it('returns 0 when the control has no policies, tasks, or document types', () => {
    expect(getControlProgressPercent([], [], 'c1', [], [])).toBe(0);
  });

  it('returns 100 when every linked policy and task is complete', () => {
    const percent = getControlProgressPercent(
      [{ status: 'published' }],
      [makeTask({ status: 'done' })],
      'c1',
      [],
      [],
    );
    expect(percent).toBe(100);
  });

  it('returns 67 when 2 of 3 artifacts are complete (1 policy published, 1 of 2 tasks done)', () => {
    const percent = getControlProgressPercent(
      [{ status: 'published' }],
      [makeTask({ id: 't1', status: 'done' }), makeTask({ id: 't2', status: 'todo' })],
      'c1',
      [],
      [],
    );
    expect(percent).toBe(67);
  });

  it('counts a recent document submission as a completed artifact', () => {
    const recent = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const percent = getControlProgressPercent(
      [],
      [],
      'c1',
      [{ formType: 'access_control_policy' }],
      [{ id: 'evs1', formType: 'access_control_policy', submittedAt: recent }],
    );
    expect(percent).toBe(100);
  });

  it('does not count a document submission older than 6 months as complete', () => {
    const stale = new Date(Date.now() - SIX_MONTHS_MS - 24 * 60 * 60 * 1000);
    const percent = getControlProgressPercent(
      [],
      [],
      'c1',
      [{ formType: 'access_control_policy' }],
      [{ id: 'evs1', formType: 'access_control_policy', submittedAt: stale }],
    );
    expect(percent).toBe(0);
  });

  it('excludes not relevant documents from progress', () => {
    const percent = getControlProgressPercent(
      [{ status: 'published' }],
      [],
      'c1',
      [{ formType: 'access_control_policy', isNotRelevant: true }],
      [],
    );
    expect(percent).toBe(100);
  });

  it('only counts tasks linked to the given control', () => {
    // The unrelated task is `todo` so a missing filter would drop the percent
    // from 100 (correct: only the linked, done task counts) to 50 (broken).
    const percent = getControlProgressPercent(
      [],
      [
        makeTask({ id: 't1', status: 'done', controls: [{ id: 'c1' } as Control] }),
        makeTask({ id: 't2', status: 'todo', controls: [{ id: 'other' } as Control] }),
      ],
      'c1',
      [],
      [],
    );
    expect(percent).toBe(100);
  });
});

describe('getRequirementCompliancePercent', () => {
  it('returns 0 when no controls are mapped', () => {
    expect(getRequirementCompliancePercent([])).toBe(0);
  });

  it('returns the average of the underlying control progress percents', () => {
    expect(getRequirementCompliancePercent([0, 100])).toBe(50);
    expect(getRequirementCompliancePercent([67, 33])).toBe(50);
  });

  it('returns the bubbled-up percent for a requirement with a single in-progress control', () => {
    expect(getRequirementCompliancePercent([67])).toBe(67);
  });
});

describe('getRequirementArtifactCounts', () => {
  it('returns zero counts when there are no controls', () => {
    const counts = getRequirementArtifactCounts([], [], []);
    expect(counts).toEqual({
      policies: { total: 0, completed: 0 },
      tasks: { total: 0, completed: 0 },
      documents: { total: 0, completed: 0 },
    });
  });

  it('aggregates counts across multiple controls', () => {
    const controls = [
      {
        id: 'c1',
        policies: [{ id: 'p1', status: 'published' }],
        controlDocumentTypes: [{ formType: 'access_control_policy' }],
      },
      {
        id: 'c2',
        policies: [{ id: 'p2', status: 'draft' }],
        controlDocumentTypes: [],
      },
    ];
    const tasks = [
      makeTask({ id: 't1', status: 'done', controls: [{ id: 'c1' } as Control] }),
      makeTask({ id: 't2', status: 'todo', controls: [{ id: 'c2' } as Control] }),
    ];
    const counts = getRequirementArtifactCounts(controls, tasks, []);
    expect(counts).toEqual({
      policies: { total: 2, completed: 1 },
      tasks: { total: 2, completed: 1 },
      documents: { total: 1, completed: 0 },
    });
  });

  it('deduplicates policies, tasks, and document types shared across controls', () => {
    const controls = [
      {
        id: 'c1',
        policies: [{ id: 'p1', status: 'published' }],
        controlDocumentTypes: [{ formType: 'access_control_policy' }],
      },
      {
        id: 'c2',
        policies: [{ id: 'p1', status: 'published' }],
        controlDocumentTypes: [{ formType: 'access_control_policy' }],
      },
    ];
    const sharedTask = makeTask({
      id: 't1',
      status: 'done',
      controls: [{ id: 'c1' } as Control, { id: 'c2' } as Control],
    });
    const counts = getRequirementArtifactCounts(controls, [sharedTask], []);
    expect(counts).toEqual({
      policies: { total: 1, completed: 1 },
      tasks: { total: 1, completed: 1 },
      documents: { total: 1, completed: 0 },
    });
  });

  it('counts a document type as completed when there is a recent submission', () => {
    const recent = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const stale = new Date(Date.now() - SIX_MONTHS_MS - 24 * 60 * 60 * 1000);
    const controls = [
      {
        id: 'c1',
        policies: [],
        controlDocumentTypes: [
          { formType: 'access_control_policy' },
          { formType: 'incident_response_plan' },
        ],
      },
    ];
    const submissions: EvidenceSubmissionInfo[] = [
      { id: 'evs1', formType: 'access_control_policy', submittedAt: recent },
      { id: 'evs2', formType: 'incident_response_plan', submittedAt: stale },
    ];
    const counts = getRequirementArtifactCounts(controls, [], submissions);
    expect(counts.documents).toEqual({ total: 2, completed: 1 });
  });

  it('excludes not relevant document types from counts', () => {
    const controls = [
      {
        id: 'c1',
        policies: [],
        controlDocumentTypes: [
          { formType: 'access_control_policy', isNotRelevant: true },
          { formType: 'incident_response_plan' },
        ],
      },
    ];
    const counts = getRequirementArtifactCounts(controls, [], []);
    expect(counts.documents).toEqual({ total: 1, completed: 0 });
  });
});

describe('getFrameworkAggregatePercent', () => {
  it('returns 0 when the framework has no artifacts', () => {
    expect(getFrameworkAggregatePercent([], [], [])).toBe(0);
  });

  it('returns 100 when every artifact across the framework is complete', () => {
    const controls = [
      {
        id: 'c1',
        policies: [{ id: 'p1', status: 'published' }],
        controlDocumentTypes: [],
      },
    ];
    const tasks = [makeTask({ id: 't1', status: 'done', controls: [{ id: 'c1' } as Control] })];
    expect(getFrameworkAggregatePercent(controls, tasks, [])).toBe(100);
  });

  it('weights every policy, task, and document equally across the framework', () => {
    const controls = [
      {
        id: 'c1',
        policies: [{ id: 'p1', status: 'published' }],
        controlDocumentTypes: [{ formType: 'access_control_policy' }],
      },
      {
        id: 'c2',
        policies: [{ id: 'p2', status: 'draft' }],
        controlDocumentTypes: [],
      },
    ];
    const tasks = [
      makeTask({ id: 't1', status: 'done', controls: [{ id: 'c1' } as Control] }),
      makeTask({ id: 't2', status: 'todo', controls: [{ id: 'c2' } as Control] }),
    ];
    // 5 total artifacts (2 policies, 2 tasks, 1 doc), 2 completed → 40%
    expect(getFrameworkAggregatePercent(controls, tasks, [])).toBe(40);
  });

  it('excludes not relevant documents from aggregate progress', () => {
    const controls = [
      {
        id: 'c1',
        policies: [{ id: 'p1', status: 'published' }],
        controlDocumentTypes: [{ formType: 'access_control_policy', isNotRelevant: true }],
      },
    ];
    expect(getFrameworkAggregatePercent(controls, [], [])).toBe(100);
  });
});
