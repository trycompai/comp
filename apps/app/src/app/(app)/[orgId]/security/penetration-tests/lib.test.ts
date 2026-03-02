import { describe, expect, it } from 'vitest';

import { formatReportDate, isReportInProgress, sortReportsByUpdatedAtDesc, statusLabel } from './lib';

describe('penetration test lib helpers', () => {
  it('sortReportsByUpdatedAtDesc orders newest first', () => {
    const sorted = sortReportsByUpdatedAtDesc([
      { updatedAt: '2023-01-01T00:00:00Z', id: 'old', targetUrl: '', repoUrl: '', status: 'completed', createdAt: '', error: null, temporalUiUrl: null, webhookUrl: null, userId: '', organizationId: '', sandboxId: '', workflowId: '', sessionId: '' },
      { updatedAt: '2024-01-02T00:00:00Z', id: 'new', targetUrl: '', repoUrl: '', status: 'completed', createdAt: '', error: null, temporalUiUrl: null, webhookUrl: null, userId: '', organizationId: '', sandboxId: '', workflowId: '', sessionId: '' },
      { updatedAt: 'invalid-date', id: 'bad', targetUrl: '', repoUrl: '', status: 'completed', createdAt: '', error: null, temporalUiUrl: null, webhookUrl: null, userId: '', organizationId: '', sandboxId: '', workflowId: '', sessionId: '' },
    ]);

    expect(sorted.map((report) => report.id)).toEqual(['new', 'old', 'bad']);
  });

  it('isReportInProgress returns true only for active lifecycle states', () => {
    expect(isReportInProgress('provisioning')).toBe(true);
    expect(isReportInProgress('cloning')).toBe(true);
    expect(isReportInProgress('running')).toBe(true);
    expect(isReportInProgress('completed')).toBe(false);
    expect(isReportInProgress('failed')).toBe(false);
    expect(isReportInProgress('cancelled')).toBe(false);
  });

  it('provides stable human labels for all known states', () => {
    expect(statusLabel).toMatchObject({
      provisioning: 'Queued',
      cloning: 'Preparing',
      running: 'Running',
      completed: 'Completed',
      failed: 'Failed',
      cancelled: 'Cancelled',
    });
  });

  it('falls back to raw value when date formatting fails', () => {
    expect(formatReportDate('not-a-date')).toBe('not-a-date');
  });

  it('sorts as equal when both timestamps are invalid', () => {
    const sorted = sortReportsByUpdatedAtDesc([
      {
        updatedAt: 'invalid-date',
        id: 'first',
        targetUrl: '',
        repoUrl: '',
        status: 'completed',
        createdAt: '',
        error: null,
        temporalUiUrl: null,
        webhookUrl: null,
        userId: '',
        organizationId: '',
        sandboxId: '',
        workflowId: '',
        sessionId: '',
      },
      {
        updatedAt: 'also-invalid',
        id: 'second',
        targetUrl: '',
        repoUrl: '',
        status: 'completed',
        createdAt: '',
        error: null,
        temporalUiUrl: null,
        webhookUrl: null,
        userId: '',
        organizationId: '',
        sandboxId: '',
        workflowId: '',
        sessionId: '',
      },
    ]);

    expect(sorted.map((report) => report.id)).toEqual(['first', 'second']);
  });

  it('sorts invalid timestamps as oldest', () => {
    const sorted = sortReportsByUpdatedAtDesc([
      {
        updatedAt: 'invalid-date',
        id: 'invalid',
        targetUrl: '',
        repoUrl: '',
        status: 'completed',
        createdAt: '',
        error: null,
        temporalUiUrl: null,
        webhookUrl: null,
        userId: '',
        organizationId: '',
        sandboxId: '',
        workflowId: '',
        sessionId: '',
      },
      {
        updatedAt: '2025-02-01T10:00:00Z',
        id: 'valid',
        targetUrl: '',
        repoUrl: '',
        status: 'completed',
        createdAt: '',
        error: null,
        temporalUiUrl: null,
        webhookUrl: null,
        userId: '',
        organizationId: '',
        sandboxId: '',
        workflowId: '',
        sessionId: '',
      },
    ]);

    expect(sorted.map((report) => report.id)).toEqual(['valid', 'invalid']);
  });
});
