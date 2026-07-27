// Importing the runner evaluates queue()/task() at module load — stub them.
// runBrowserAutomation + the integration email path are only referenced inside
// the task body (not at load), but stub them so nothing real is pulled in.
jest.mock('@trigger.dev/sdk', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
  queue: jest.fn(() => ({ name: 'q' })),
  task: (config: unknown) => config,
}));
jest.mock('./run-browser-automation', () => ({
  runBrowserAutomation: { batchTriggerAndWait: jest.fn() },
}));
jest.mock('../integration-platform/run-org-integration-checks', () => ({
  sendBundledFailureEmails: jest.fn(),
}));

import { collectFailedBrowserTasks } from './run-org-browser-automations';

describe('collectFailedBrowserTasks', () => {
  it('reports a task that freshly transitioned to failed (control regressed)', () => {
    const failed = collectFailedBrowserTasks([
      {
        ok: true,
        output: {
          success: false,
          taskId: 'tsk_1',
          taskTitle: 'GitHub branch protection',
          evaluationStatus: 'fail',
          statusChangedToFailed: true,
        },
      },
    ]);

    expect(failed).toEqual([
      {
        taskId: 'tsk_1',
        taskTitle: 'GitHub branch protection',
        failedCount: 1,
        totalCount: 1,
      },
    ]);
  });

  it('reports a task whose connection needs reconnect (needsReauth)', () => {
    const failed = collectFailedBrowserTasks([
      {
        ok: true,
        output: {
          success: false,
          taskId: 'tsk_1',
          taskTitle: 'Datadog evidence',
          needsReauth: true,
          statusChangedToFailed: true,
        },
      },
    ]);

    expect(failed.map((f) => f.taskId)).toEqual(['tsk_1']);
  });

  it('aggregates multiple automations of the same task into ONE entry with an honest tally', () => {
    const failed = collectFailedBrowserTasks([
      // Same task, two automations run this batch: one passed, one failed.
      {
        ok: true,
        output: {
          success: true,
          taskId: 'tsk_1',
          taskTitle: 'Task 1',
          statusChangedToFailed: false,
        },
      },
      {
        ok: true,
        output: {
          success: false,
          taskId: 'tsk_1',
          taskTitle: 'Task 1',
          evaluationStatus: 'fail',
          statusChangedToFailed: true,
        },
      },
    ]);

    expect(failed).toEqual([
      { taskId: 'tsk_1', taskTitle: 'Task 1', failedCount: 1, totalCount: 2 },
    ]);
  });

  it('does not double-count when concurrent automations both report the transition', () => {
    // The task→failed flip races: both children can read oldStatus !== failed
    // and each returns statusChangedToFailed=true. Must still be ONE entry.
    const failed = collectFailedBrowserTasks([
      {
        ok: true,
        output: {
          success: false,
          taskId: 'tsk_1',
          taskTitle: 'Task 1',
          evaluationStatus: 'fail',
          statusChangedToFailed: true,
        },
      },
      {
        ok: true,
        output: {
          success: false,
          taskId: 'tsk_1',
          taskTitle: 'Task 1',
          evaluationStatus: 'fail',
          statusChangedToFailed: true,
        },
      },
    ]);

    expect(failed).toHaveLength(1);
    expect(failed[0]).toEqual({
      taskId: 'tsk_1',
      taskTitle: 'Task 1',
      failedCount: 2,
      totalCount: 2,
    });
  });

  it('drops runs that did not transition, errored, passed, or lack a taskId', () => {
    const failed = collectFailedBrowserTasks([
      // already-failed (no fresh transition) → dropped
      {
        ok: true,
        output: {
          success: false,
          taskId: 't_already',
          taskTitle: 'Already failed',
          evaluationStatus: 'fail',
          statusChangedToFailed: false,
        },
      },
      // infra-only failure that didn't flip the task → dropped
      {
        ok: true,
        output: {
          success: false,
          taskId: 't_infra',
          taskTitle: 'Timed out',
          statusChangedToFailed: false,
        },
      },
      // passing run → dropped
      {
        ok: true,
        output: {
          success: true,
          taskId: 't_pass',
          taskTitle: 'Passed',
          statusChangedToFailed: false,
        },
      },
      // crashed child → dropped
      { ok: false },
      // not-found / disabled run (no taskId) → dropped
      { ok: true, output: { success: false } },
    ]);

    expect(failed).toEqual([]);
  });
});
