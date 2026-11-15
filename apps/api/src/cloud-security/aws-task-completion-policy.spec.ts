jest.mock('@db', () => ({ db: {} }));

import {
  canAutoCompleteTask,
  taskCompletionSnapshot,
} from './aws-task-completion';
import { candidate, NOW } from '../../test/fixtures/aws-task-completion-data';

describe('automatic AWS task completion evidence policy', () => {
  it.each(['todo', 'in_progress', 'failed'] as const)(
    'allows fully evaluated automated %s tasks',
    (status) => {
      expect(canAutoCompleteTask(candidate({ status }))).toBe(true);
    },
  );

  it.each(['in_review', 'done', 'not_relevant'] as const)(
    'preserves the %s decision',
    (status) => {
      expect(canAutoCompleteTask(candidate({ status }))).toBe(false);
    },
  );

  it('preserves review even when the global approval feature was disabled', () => {
    expect(
      canAutoCompleteTask(
        candidate({
          status: 'in_review',
          organization: { evidenceApprovalEnabled: false },
        }),
      ),
    ).toBe(false);
  });

  it('preserves manual and archived tasks', () => {
    expect(canAutoCompleteTask(candidate({ automationStatus: 'MANUAL' }))).toBe(
      false,
    );
    expect(canAutoCompleteTask(candidate({ archivedAt: NOW }))).toBe(false);
  });

  it('does not substitute a cloud scan for assigned human approval', () => {
    expect(canAutoCompleteTask(candidate({ approverId: 'reviewer' }))).toBe(
      false,
    );
  });

  it('preserves the established approval-disabled path with a stale approver', () => {
    expect(
      canAutoCompleteTask(
        candidate({
          approverId: 'stale-reviewer',
          organization: { evidenceApprovalEnabled: false },
        }),
      ),
    ).toBe(true);
  });

  it('keeps the existing path for tasks without enabled custom collectors', () => {
    expect(canAutoCompleteTask(candidate({ evidenceAutomations: [] }))).toBe(
      true,
    );
  });

  it('requires a run from each enabled collector', () => {
    const task = candidate();
    task.evidenceAutomations[0].runs = [];
    expect(canAutoCompleteTask(task)).toBe(false);
  });

  it.each(['pending', 'running', 'failed', 'cancelled'] as const)(
    'rejects a %s execution even if it carries a pass marker',
    (status) => {
      const task = candidate();
      task.evidenceAutomations[0].runs[0].status = status;
      expect(canAutoCompleteTask(task)).toBe(false);
    },
  );

  it.each([false, null])('rejects execution success=%s', (success) => {
    const task = candidate();
    task.evidenceAutomations[0].runs[0].success = success;
    expect(canAutoCompleteTask(task)).toBe(false);
  });

  it.each(['fail', null] as const)(
    'does not treat collection success and evaluation=%s as a pass',
    (evaluationStatus) => {
      const task = candidate();
      task.evidenceAutomations[0].runs[0].evaluationStatus = evaluationStatus;
      expect(canAutoCompleteTask(task)).toBe(false);
    },
  );

  it('rejects an execution without its completion time', () => {
    const task = candidate();
    task.evidenceAutomations[0].runs[0].completedAt = null;
    expect(canAutoCompleteTask(task)).toBe(false);
  });

  it('requires an execution after the current source publication/update', () => {
    const task = candidate();
    task.evidenceAutomations[0].runs[0].startedAt = null;
    expect(canAutoCompleteTask(task)).toBe(false);
    task.evidenceAutomations[0].runs[0].startedAt = new Date(NOW.getTime() - 1);
    expect(canAutoCompleteTask(task)).toBe(false);
    task.evidenceAutomations[0].runs[0].startedAt = new Date(NOW.getTime() + 1);
    expect(canAutoCompleteTask(task)).toBe(false);
  });

  it.each([null, '', ' \n\t'])(
    'requires configured criteria: %s',
    (criteria) => {
      const task = candidate();
      task.evidenceAutomations[0].evaluationCriteria = criteria;
      expect(canAutoCompleteTask(task)).toBe(false);
    },
  );

  it('does not accept a draft or superseded version evaluation', () => {
    const task = candidate();
    task.evidenceAutomations[0].runs[0].version = null;
    expect(canAutoCompleteTask(task)).toBe(false);
    task.evidenceAutomations[0].runs[0].version = 1;
    expect(canAutoCompleteTask(task)).toBe(false);
  });

  it('does not infer criteria for historical evaluations', () => {
    const task = candidate();
    task.evidenceAutomations[0].runs[0].evaluationCriteriaSnapshot = null;
    expect(canAutoCompleteTask(task)).toBe(false);
  });

  it('rejects a pass evaluated under different criteria before admission', () => {
    const task = candidate();
    task.evidenceAutomations[0].evaluationCriteria =
      'A new, stricter requirement';
    expect(canAutoCompleteTask(task)).toBe(false);
  });

  it('does not qualify an unpublished collector', () => {
    const task = candidate();
    task.evidenceAutomations[0].versions = [];
    expect(canAutoCompleteTask(task)).toBe(false);
  });

  it('requires every enabled collector, not just the first passing one', () => {
    const task = candidate();
    const other = structuredClone(task.evidenceAutomations[0]);
    other.id = 'second-collector';
    other.runs[0].evaluationStatus = 'fail';
    task.evidenceAutomations.push(other);
    expect(canAutoCompleteTask(task)).toBe(false);
  });
});

describe('conditional completion snapshot', () => {
  it('rechecks manual decisions and approval configuration in the same write', () => {
    const task = candidate();
    const where = taskCompletionSnapshot({
      task,
      organizationId: 'synthetic-org',
    });
    expect(where).toMatchObject({
      id: task.id,
      organizationId: 'synthetic-org',
      status: task.status,
      automationStatus: 'AUTOMATED',
      archivedAt: null,
      updatedAt: NOW,
      approverId: null,
      organization: { evidenceApprovalEnabled: true },
    });
  });

  it('guards newly enabled collectors and newer runs/publications/evaluations', () => {
    const task = candidate();
    const where = taskCompletionSnapshot({
      task,
      organizationId: 'synthetic-org',
    });
    expect(where.AND).toEqual([
      {
        evidenceAutomations: {
          none: {
            isEnabled: true,
            id: { notIn: ['synthetic-automation'] },
          },
        },
      },
      {
        evidenceAutomations: {
          some: {
            id: 'synthetic-automation',
            isEnabled: true,
            evaluationCriteria: task.evidenceAutomations[0].evaluationCriteria,
            versions: {
              some: task.evidenceAutomations[0].versions[0],
              none: { version: { gt: 2 } },
            },
            runs: {
              some: task.evidenceAutomations[0].runs[0],
              none: {
                OR: [
                  { createdAt: { gt: NOW } },
                  { createdAt: NOW, id: { gt: 'latest-run' } },
                ],
              },
            },
          },
        },
      },
    ]);
  });

  it('requires no enabled collector to have appeared for an empty snapshot', () => {
    const task = candidate({ evidenceAutomations: [] });
    const where = taskCompletionSnapshot({
      task,
      organizationId: 'synthetic-org',
    });
    expect(where.AND).toEqual([
      { evidenceAutomations: { none: { isEnabled: true, id: { notIn: [] } } } },
    ]);
  });

  it('cannot build a completion filter from missing evidence', () => {
    const task = candidate();
    task.evidenceAutomations[0].runs = [];
    expect(() =>
      taskCompletionSnapshot({ task, organizationId: 'synthetic-org' }),
    ).toThrow('without evaluated evidence');
  });
});
