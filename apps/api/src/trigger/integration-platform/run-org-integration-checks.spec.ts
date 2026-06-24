const mockDb = {
  task: { findMany: jest.fn() },
  member: { findMany: jest.fn() },
};

jest.mock('@db', () => ({ db: mockDb }));

const isUserUnsubscribedMock = jest.fn().mockResolvedValue(false);
jest.mock('@trycompai/email', () => ({
  isUserUnsubscribed: (...args: unknown[]) => isUserUnsubscribedMock(...args),
}));

const triggerEmailMock = jest.fn().mockResolvedValue({ id: 'email_1' });
jest.mock('../../email/trigger-email', () => ({
  triggerEmail: (...args: unknown[]) => triggerEmailMock(...args),
}));

// Return the props so tests can inspect the bundled task list passed to the
// email template.
jest.mock('../../email/templates/automation-bulk-failures', () => ({
  AutomationBulkFailuresEmail: (props: unknown) => ({ __email: 'bulk', props }),
}));

// Importing the runner evaluates queue()/task() at module load — stub them.
// runTaskIntegrationChecks is only referenced inside the task body (not load).
jest.mock('@trigger.dev/sdk', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
  queue: jest.fn(() => ({ name: 'q' })),
  task: (config: unknown) => config,
}));
jest.mock('./run-task-integration-checks', () => ({
  runTaskIntegrationChecks: { batchTriggerAndWait: jest.fn() },
}));

import {
  collectFailedTasks,
  sendBundledFailureEmails,
  type FailedTaskSummary,
} from './run-org-integration-checks';
import type { TaskCheckRunResult } from './run-task-integration-checks';

function recipientEmails(): string[] {
  return triggerEmailMock.mock.calls.map((call) => call[0].to as string);
}

function emailedTaskTitles(callIndex = 0): string[] {
  const react = triggerEmailMock.mock.calls[callIndex][0].react as {
    props: { tasks: Array<{ title: string }> };
  };
  return react.props.tasks.map((t) => t.title);
}

const okRun = (
  output: Partial<Extract<TaskCheckRunResult, { success: true }>> & {
    taskId: string;
  },
): { ok: true; output: TaskCheckRunResult } => ({
  ok: true,
  output: {
    success: true,
    taskTitle: output.taskId,
    checksRun: 1,
    totalPassing: 0,
    totalFindings: 0,
    taskStatus: 'failed',
    statusChangedToFailed: true,
    failedCount: 1,
    totalCount: 1,
    ...output,
  },
});

describe('collectFailedTasks', () => {
  it('keeps only ok + success + freshly-transitioned-to-failed runs', () => {
    const failed = collectFailedTasks([
      okRun({ taskId: 't1', taskTitle: 'Task 1', failedCount: 2, totalCount: 9 }),
      // success but NOT a fresh transition (already failed) → dropped
      okRun({ taskId: 't2', statusChangedToFailed: false }),
      // child run errored/crashed → dropped
      { ok: false },
      // child returned a failure result → dropped
      { ok: true, output: { success: false, taskId: 't3', error: 'boom' } },
    ]);

    expect(failed).toEqual([
      { taskId: 't1', taskTitle: 'Task 1', failedCount: 2, totalCount: 9 },
    ]);
  });

  it('returns [] when nothing failed', () => {
    expect(
      collectFailedTasks([okRun({ taskId: 't1', statusChangedToFailed: false })]),
    ).toEqual([]);
  });
});

describe('sendBundledFailureEmails', () => {
  const failedTasks: FailedTaskSummary[] = [
    { taskId: 't1', taskTitle: 'Task 1', failedCount: 2, totalCount: 10 },
    { taskId: 't2', taskTitle: 'Task 2', failedCount: 1, totalCount: 5 },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    isUserUnsubscribedMock.mockResolvedValue(false);
    // Assignee of t1; t2 unassigned.
    mockDb.task.findMany.mockResolvedValue([
      { assignee: { user: { id: 'u_assignee', name: 'Ann', email: 'ann@x.com' } } },
      { assignee: null },
    ]);
    // admin + owner + an employee (excluded) + the assignee again (deduped).
    mockDb.member.findMany.mockResolvedValue([
      { role: 'admin', user: { id: 'u_admin', name: 'Adam', email: 'adam@x.com' } },
      { role: 'owner', user: { id: 'u_owner', name: 'Oli', email: 'oli@x.com' } },
      { role: 'employee', user: { id: 'u_emp', name: 'Eve', email: 'eve@x.com' } },
      {
        role: 'admin,auditor',
        user: { id: 'u_assignee', name: 'Ann', email: 'ann@x.com' },
      },
    ]);
  });

  it('sends ONE bundled email per recipient (assignees ∪ admins/owners, deduped)', async () => {
    await sendBundledFailureEmails({
      organizationId: 'org1',
      organizationName: 'Acme',
      failedTasks,
    });

    // assignee + admin + owner; employee excluded; assignee not double-sent.
    expect(recipientEmails().sort()).toEqual(
      ['adam@x.com', 'ann@x.com', 'oli@x.com'].sort(),
    );
    // Every recipient gets the FULL list of failed tasks.
    expect(emailedTaskTitles(0)).toEqual(['Task 1', 'Task 2']);
    expect(triggerEmailMock.mock.calls[0][0].subject).toBe(
      '2 tasks failed automated checks in Acme',
    );
  });

  it('skips unsubscribed recipients', async () => {
    isUserUnsubscribedMock.mockImplementation(
      (_db, email: string) => Promise.resolve(email === 'adam@x.com'),
    );

    await sendBundledFailureEmails({
      organizationId: 'org1',
      organizationName: 'Acme',
      failedTasks,
    });

    expect(recipientEmails().sort()).toEqual(['ann@x.com', 'oli@x.com'].sort());
  });

  it('sends nothing when there are no failed tasks', async () => {
    await sendBundledFailureEmails({
      organizationId: 'org1',
      organizationName: 'Acme',
      failedTasks: [],
    });

    expect(triggerEmailMock).not.toHaveBeenCalled();
    expect(mockDb.task.findMany).not.toHaveBeenCalled();
  });

  it('swallows a recipient-resolution failure (best-effort) instead of throwing', async () => {
    // A DB blip here must NOT propagate out of the runner — otherwise the whole
    // org run would fail and retry, and the email would be lost permanently.
    mockDb.task.findMany.mockRejectedValue(new Error('db down'));

    await expect(
      sendBundledFailureEmails({
        organizationId: 'org1',
        organizationName: 'Acme',
        failedTasks,
      }),
    ).resolves.toBeUndefined();

    expect(triggerEmailMock).not.toHaveBeenCalled();
  });
});
