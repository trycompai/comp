jest.mock('@db', () => ({
  db: {
    browserAutomation: { findUnique: jest.fn(), update: jest.fn() },
    browserAutomationRun: { create: jest.fn() },
    task: { findUnique: jest.fn(), update: jest.fn() },
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

import {
  isTaskStatusProtectedFromAutomation,
  shouldMarkTaskDoneAfterBrowserRun,
  shouldMarkTaskFailedAfterBrowserRun,
} from './run-browser-automation';

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
