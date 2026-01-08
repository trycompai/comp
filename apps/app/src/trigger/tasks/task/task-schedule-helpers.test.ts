import { describe, expect, it } from 'vitest';

import {
  calculateNextDueDate,
  getTargetStatus,
  type TaskAutomationData,
} from './task-schedule-helpers';

describe('task-schedule-helpers', () => {
  describe('getTargetStatus', () => {
    describe('No automations configured', () => {
      it('should return "todo" when no automations are configured', () => {
        const task: TaskAutomationData = {
          evidenceAutomations: [],
          integrationCheckRuns: [],
        };

        expect(getTargetStatus(task)).toBe('todo');
      });
    });

    describe('Custom Automations only', () => {
      it('should return "done" when all custom automations pass', () => {
        const task: TaskAutomationData = {
          evidenceAutomations: [
            { id: 'aut_1', runs: [{ evaluationStatus: 'pass' }] },
            { id: 'aut_2', runs: [{ evaluationStatus: 'pass' }] },
          ],
          integrationCheckRuns: [],
        };

        expect(getTargetStatus(task)).toBe('done');
      });

      it('should return "failed" when any custom automation fails', () => {
        const task: TaskAutomationData = {
          evidenceAutomations: [
            { id: 'aut_1', runs: [{ evaluationStatus: 'pass' }] },
            { id: 'aut_2', runs: [{ evaluationStatus: 'fail' }] },
          ],
          integrationCheckRuns: [],
        };

        expect(getTargetStatus(task)).toBe('failed');
      });

      it('should return "failed" when custom automation has no runs', () => {
        const task: TaskAutomationData = {
          evidenceAutomations: [{ id: 'aut_1', runs: [] }],
          integrationCheckRuns: [],
        };

        expect(getTargetStatus(task)).toBe('failed');
      });

      it('should return "failed" when custom automation has null evaluationStatus', () => {
        const task: TaskAutomationData = {
          evidenceAutomations: [{ id: 'aut_1', runs: [{ evaluationStatus: null }] }],
          integrationCheckRuns: [],
        };

        expect(getTargetStatus(task)).toBe('failed');
      });

      it('should only check the latest run for each custom automation', () => {
        const task: TaskAutomationData = {
          evidenceAutomations: [
            {
              id: 'aut_1',
              runs: [
                { evaluationStatus: 'pass' }, // Latest - pass
                { evaluationStatus: 'fail' }, // Older - fail (should be ignored)
              ],
            },
          ],
          integrationCheckRuns: [],
        };

        expect(getTargetStatus(task)).toBe('done');
      });
    });

    describe('App Automations only', () => {
      it('should return "done" when all app automations succeed', () => {
        const task: TaskAutomationData = {
          evidenceAutomations: [],
          integrationCheckRuns: [
            { checkId: 'github-mfa', status: 'success', createdAt: new Date('2024-01-06') },
            { checkId: 'slack-channels', status: 'success', createdAt: new Date('2024-01-06') },
          ],
        };

        expect(getTargetStatus(task)).toBe('done');
      });

      it('should return "failed" when any app automation fails', () => {
        const task: TaskAutomationData = {
          evidenceAutomations: [],
          integrationCheckRuns: [
            { checkId: 'github-mfa', status: 'success', createdAt: new Date('2024-01-06') },
            { checkId: 'slack-channels', status: 'failed', createdAt: new Date('2024-01-06') },
          ],
        };

        expect(getTargetStatus(task)).toBe('failed');
      });

      it('should return "failed" when app automation is pending', () => {
        const task: TaskAutomationData = {
          evidenceAutomations: [],
          integrationCheckRuns: [
            { checkId: 'github-mfa', status: 'pending', createdAt: new Date('2024-01-06') },
          ],
        };

        expect(getTargetStatus(task)).toBe('failed');
      });

      it('should return "failed" when app automation is running', () => {
        const task: TaskAutomationData = {
          evidenceAutomations: [],
          integrationCheckRuns: [
            { checkId: 'github-mfa', status: 'running', createdAt: new Date('2024-01-06') },
          ],
        };

        expect(getTargetStatus(task)).toBe('failed');
      });

      it('should check latest run for each checkId separately', () => {
        const task: TaskAutomationData = {
          evidenceAutomations: [],
          integrationCheckRuns: [
            // Sorted by createdAt desc (latest first)
            {
              checkId: 'github-mfa',
              status: 'success',
              createdAt: new Date('2024-01-06T12:00:00'),
            },
            {
              checkId: 'slack-channels',
              status: 'failed',
              createdAt: new Date('2024-01-06T11:00:00'),
            },
            { checkId: 'github-mfa', status: 'failed', createdAt: new Date('2024-01-05T10:00:00') }, // Older, ignored
            {
              checkId: 'slack-channels',
              status: 'success',
              createdAt: new Date('2024-01-04T09:00:00'),
            }, // Older, ignored
          ],
        };

        // github-mfa: latest is success ✓
        // slack-channels: latest is failed ✗
        expect(getTargetStatus(task)).toBe('failed');
      });

      it('should not depend on input ordering when selecting latest per checkId', () => {
        const task: TaskAutomationData = {
          evidenceAutomations: [],
          integrationCheckRuns: [
            // Unsorted on purpose
            {
              checkId: 'github-mfa',
              status: 'failed',
              createdAt: new Date('2024-01-05T10:00:00'),
            },
            {
              checkId: 'slack-channels',
              status: 'success',
              createdAt: new Date('2024-01-04T09:00:00'),
            },
            {
              checkId: 'slack-channels',
              status: 'failed',
              createdAt: new Date('2024-01-06T11:00:00'),
            }, // Latest for slack-channels
            {
              checkId: 'github-mfa',
              status: 'success',
              createdAt: new Date('2024-01-06T12:00:00'),
            }, // Latest for github-mfa
          ],
        };

        // github-mfa: latest is success ✓
        // slack-channels: latest is failed ✗
        expect(getTargetStatus(task)).toBe('failed');
      });

      it('should return "done" when all check types have successful latest runs', () => {
        const task: TaskAutomationData = {
          evidenceAutomations: [],
          integrationCheckRuns: [
            // Sorted by createdAt desc (latest first)
            {
              checkId: 'github-mfa',
              status: 'success',
              createdAt: new Date('2024-01-06T12:00:00'),
            },
            {
              checkId: 'slack-channels',
              status: 'success',
              createdAt: new Date('2024-01-06T11:00:00'),
            },
            { checkId: 'github-mfa', status: 'failed', createdAt: new Date('2024-01-05T10:00:00') }, // Older, ignored
          ],
        };

        expect(getTargetStatus(task)).toBe('done');
      });
    });

    describe('Both Custom and App Automations', () => {
      it('should return "done" when both types pass', () => {
        const task: TaskAutomationData = {
          evidenceAutomations: [{ id: 'aut_1', runs: [{ evaluationStatus: 'pass' }] }],
          integrationCheckRuns: [
            { checkId: 'github-mfa', status: 'success', createdAt: new Date('2024-01-06') },
          ],
        };

        expect(getTargetStatus(task)).toBe('done');
      });

      it('should return "failed" when custom passes but app fails', () => {
        const task: TaskAutomationData = {
          evidenceAutomations: [{ id: 'aut_1', runs: [{ evaluationStatus: 'pass' }] }],
          integrationCheckRuns: [
            { checkId: 'github-mfa', status: 'failed', createdAt: new Date('2024-01-06') },
          ],
        };

        expect(getTargetStatus(task)).toBe('failed');
      });

      it('should return "failed" when custom fails but app passes', () => {
        const task: TaskAutomationData = {
          evidenceAutomations: [{ id: 'aut_1', runs: [{ evaluationStatus: 'fail' }] }],
          integrationCheckRuns: [
            { checkId: 'github-mfa', status: 'success', createdAt: new Date('2024-01-06') },
          ],
        };

        expect(getTargetStatus(task)).toBe('failed');
      });

      it('should return "failed" when both fail', () => {
        const task: TaskAutomationData = {
          evidenceAutomations: [{ id: 'aut_1', runs: [{ evaluationStatus: 'fail' }] }],
          integrationCheckRuns: [
            { checkId: 'github-mfa', status: 'failed', createdAt: new Date('2024-01-06') },
          ],
        };

        expect(getTargetStatus(task)).toBe('failed');
      });

      it('should check all custom and all app automations', () => {
        const task: TaskAutomationData = {
          evidenceAutomations: [
            { id: 'aut_1', runs: [{ evaluationStatus: 'pass' }] },
            { id: 'aut_2', runs: [{ evaluationStatus: 'pass' }] },
            { id: 'aut_3', runs: [{ evaluationStatus: 'pass' }] },
          ],
          integrationCheckRuns: [
            { checkId: 'github-mfa', status: 'success', createdAt: new Date('2024-01-06') },
            { checkId: 'slack-channels', status: 'success', createdAt: new Date('2024-01-06') },
            { checkId: 'jira-issues', status: 'success', createdAt: new Date('2024-01-06') },
          ],
        };

        expect(getTargetStatus(task)).toBe('done');
      });
    });
  });

  describe('calculateNextDueDate', () => {
    const baseDate = new Date('2024-01-15T10:00:00Z');

    it('should add 1 day for daily frequency', () => {
      const result = calculateNextDueDate(baseDate, 'daily');
      expect(result.toISOString()).toBe('2024-01-16T10:00:00.000Z');
    });

    it('should add 7 days for weekly frequency', () => {
      const result = calculateNextDueDate(baseDate, 'weekly');
      expect(result.toISOString()).toBe('2024-01-22T10:00:00.000Z');
    });

    it('should add 1 month for monthly frequency', () => {
      const result = calculateNextDueDate(baseDate, 'monthly');
      expect(result.toISOString()).toBe('2024-02-15T10:00:00.000Z');
    });

    it('should add 3 months for quarterly frequency', () => {
      const result = calculateNextDueDate(baseDate, 'quarterly');
      // Check date components (timezone-safe)
      expect(result.getFullYear()).toBe(2024);
      expect(result.getMonth()).toBe(3); // April (0-indexed)
      expect(result.getDate()).toBe(15);
    });

    it('should add 12 months for yearly frequency', () => {
      const result = calculateNextDueDate(baseDate, 'yearly');
      expect(result.toISOString()).toBe('2025-01-15T10:00:00.000Z');
    });

    it('should handle month rollover (Jan 31 + 1 month = Feb 29 in leap year)', () => {
      const jan31 = new Date('2024-01-31T10:00:00Z'); // 2024 is a leap year
      const result = calculateNextDueDate(jan31, 'monthly');
      // Feb doesn't have 31 days, so it should be Feb 29 (leap year)
      expect(result.getMonth()).toBe(1); // February
      expect(result.getDate()).toBeLessThanOrEqual(29);
    });

    it('should handle month rollover (Jan 31 + 1 month = Feb 28 in non-leap year)', () => {
      const jan31 = new Date('2023-01-31T10:00:00Z'); // 2023 is not a leap year
      const result = calculateNextDueDate(jan31, 'monthly');
      expect(result.getMonth()).toBe(1); // February
      expect(result.getDate()).toBeLessThanOrEqual(28);
    });
  });
});
