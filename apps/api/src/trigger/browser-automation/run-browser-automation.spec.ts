jest.mock('@db', () => ({
  db: {
    browserAutomation: { findUnique: jest.fn(), update: jest.fn() },
    browserAutomationRun: { create: jest.fn() },
    task: { findUnique: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
    organization: { findUnique: jest.fn() },
    member: { findMany: jest.fn() },
  },
}));

jest.mock('@trigger.dev/sdk', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
  tags: { add: jest.fn() },
  task: (config: unknown) => config,
}));

jest.mock('../../email/trigger-email', () => ({
  triggerEmail: jest.fn(),
}));

jest.mock('@trycompai/email', () => ({
  isUserUnsubscribed: jest.fn().mockResolvedValue(false),
}));

// Control what the actual browser run returns so we can drive the task-status
// transitions in the worker body.
const mockRunBrowserAutomation = jest.fn();
jest.mock('../../browserbase/browserbase.service', () => ({
  BrowserbaseService: jest.fn().mockImplementation(() => ({
    runBrowserAutomation: mockRunBrowserAutomation,
  })),
}));

import { db } from '@db';
import {
  isTaskStatusProtectedFromAutomation,
  runBrowserAutomation,
  shouldMarkTaskDoneAfterBrowserRun,
  shouldMarkTaskFailedAfterBrowserRun,
} from './run-browser-automation';

type WorkerTask = {
  run: (payload: {
    automationId: string;
    automationName: string;
    organizationId: string;
    taskId: string;
  }) => Promise<{ statusChangedToFailed: boolean }>;
};

describe('shouldMarkTaskDoneAfterBrowserRun', () => {
  it('allows screenshot-only automations to complete tasks', () => {
    expect(
      shouldMarkTaskDoneAfterBrowserRun({
        screenshotUrl: 'https://example.com/screenshot.jpg',
        evaluationCriteria: null,
      }),
    ).toBe(true);
  });

  it('requires a passing evaluation when criteria are configured', () => {
    expect(
      shouldMarkTaskDoneAfterBrowserRun({
        screenshotUrl: 'https://example.com/screenshot.jpg',
        evaluationCriteria: 'Branch protection is enabled',
        evaluationStatus: 'pass',
      }),
    ).toBe(true);

    expect(
      shouldMarkTaskDoneAfterBrowserRun({
        screenshotUrl: 'https://example.com/screenshot.jpg',
        evaluationCriteria: 'Branch protection is enabled',
        evaluationStatus: 'fail',
      }),
    ).toBe(false);
  });
});

describe('shouldMarkTaskFailedAfterBrowserRun', () => {
  it('fails the task when the control regressed (verdict fail)', () => {
    expect(shouldMarkTaskFailedAfterBrowserRun({ evaluationStatus: 'fail' })).toBe(true);
  });

  it('fails the task when the connection needs reconnect', () => {
    expect(shouldMarkTaskFailedAfterBrowserRun({ needsReauth: true })).toBe(true);
  });

  it('leaves the task alone on an infra-only failure (could not verify)', () => {
    // No verdict and not a reauth issue → timeout / model unavailable / etc.
    expect(shouldMarkTaskFailedAfterBrowserRun({})).toBe(false);
    expect(shouldMarkTaskFailedAfterBrowserRun({ needsReauth: false })).toBe(false);
  });

  it('does not fail the task on a passing verdict', () => {
    expect(shouldMarkTaskFailedAfterBrowserRun({ evaluationStatus: 'pass' })).toBe(false);
  });
});

describe('isTaskStatusProtectedFromAutomation', () => {
  it('protects a deliberate human not_relevant decision', () => {
    // A scheduled run must never overwrite this (it has a human justification).
    expect(isTaskStatusProtectedFromAutomation('not_relevant')).toBe(true);
  });

  it('does not protect the normal automatable statuses', () => {
    for (const status of ['todo', 'in_progress', 'in_review', 'done', 'failed']) {
      expect(isTaskStatusProtectedFromAutomation(status)).toBe(false);
    }
  });
});

describe('runBrowserAutomation worker — task-status transitions are atomic + guarded', () => {
  const worker = runBrowserAutomation as unknown as WorkerTask;
  const payload = {
    automationId: 'bau_1',
    automationName: 'GitHub MFA',
    organizationId: 'org_1',
    taskId: 'tsk_1',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (db.browserAutomation.findUnique as jest.Mock).mockResolvedValue({
      id: 'bau_1',
      isEnabled: true,
      evaluationCriteria: 'MFA is enforced',
    });
    // findUnique serves both the title lookup and the frequency lookup.
    (db.task.findUnique as jest.Mock).mockResolvedValue({
      title: 'Enforce MFA',
      frequency: 'monthly',
    });
    (db.task.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
    (db.browserAutomation.update as jest.Mock).mockResolvedValue({});
  });

  it('flips a passing run to done via an updateMany that excludes not_relevant', async () => {
    mockRunBrowserAutomation.mockResolvedValue({
      success: true,
      runId: 'bar_1',
      screenshotUrl: 'https://s3/shot.jpg',
      evaluationStatus: 'pass',
    });

    await worker.run(payload);

    expect(db.task.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'tsk_1',
          status: { notIn: expect.arrayContaining(['done', 'not_relevant']) },
        },
        data: expect.objectContaining({ status: 'done' }),
      }),
    );
    // The task is never updated by primary key alone (which would ignore the guard).
    expect(db.task.update).not.toHaveBeenCalled();
  });

  it('flips a regressed run to failed via an updateMany that excludes not_relevant', async () => {
    mockRunBrowserAutomation.mockResolvedValue({
      success: false,
      runId: 'bar_1',
      evaluationStatus: 'fail',
    });

    const result = await worker.run(payload);

    expect(db.task.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'tsk_1',
          status: { notIn: expect.arrayContaining(['failed', 'not_relevant']) },
        },
        data: { status: 'failed' },
      }),
    );
    expect(result.statusChangedToFailed).toBe(true);
    expect(db.task.update).not.toHaveBeenCalled();
  });

  it('treats a zero-count update as no transition (protected/already-failed task)', async () => {
    mockRunBrowserAutomation.mockResolvedValue({
      success: false,
      runId: 'bar_1',
      evaluationStatus: 'fail',
    });
    // The atomic guard matched nothing — e.g. the task was concurrently marked
    // not_relevant, or was already failed.
    (db.task.updateMany as jest.Mock).mockResolvedValue({ count: 0 });

    const result = await worker.run(payload);

    expect(result.statusChangedToFailed).toBe(false);
  });
});
