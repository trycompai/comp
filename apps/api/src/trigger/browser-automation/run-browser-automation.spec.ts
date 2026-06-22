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

import { shouldMarkTaskDoneAfterBrowserRun } from './run-browser-automation';

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
