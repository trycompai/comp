import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearConnectState,
  loadConnectState,
  saveConnectState,
} from './connect-flow-storage';

const TASK = 'tsk_123';

describe('connect-flow-storage', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('round-trips a saved analysis phase', () => {
    saveConnectState(TASK, {
      step: 'recommendation',
      url: 'https://notion.so',
      analyzeRun: null,
      analysis: {
        reachable: true,
        detectedMethods: ['password'],
        identifierType: 'email',
        extraFields: [],
        recommendation: {
          category: 'ready',
          headline: 'Ready',
          detail: 'All set',
        },
      },
    });

    const loaded = loadConnectState(TASK);
    expect(loaded?.step).toBe('recommendation');
    expect(loaded?.url).toBe('https://notion.so');
    expect(loaded?.analysis?.recommendation.category).toBe('ready');
  });

  it('persists the run handle so a checking phase can re-subscribe', () => {
    saveConnectState(TASK, {
      step: 'checking',
      url: 'https://notion.so',
      analyzeRun: { runId: 'run_1', accessToken: 'tok_1' },
      analysis: null,
    });

    expect(loadConnectState(TASK)?.analyzeRun).toEqual({
      runId: 'run_1',
      accessToken: 'tok_1',
    });
  });

  it('returns null when nothing is saved', () => {
    expect(loadConnectState(TASK)).toBeNull();
  });

  it('is scoped per task', () => {
    saveConnectState(TASK, {
      step: 'checking',
      url: 'https://notion.so',
      analyzeRun: { runId: 'run_1', accessToken: 'tok_1' },
      analysis: null,
    });
    expect(loadConnectState('tsk_other')).toBeNull();
    expect(loadConnectState(TASK)).not.toBeNull();
  });

  it('discards a checking entry with no run handle to re-subscribe to', () => {
    saveConnectState(TASK, {
      step: 'checking',
      url: 'https://notion.so',
      analyzeRun: null,
      analysis: null,
    });
    expect(loadConnectState(TASK)).toBeNull();
  });

  it('discards a stale entry past the resume window', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-15T12:00:00Z'));
    saveConnectState(TASK, {
      step: 'checking',
      url: 'https://notion.so',
      analyzeRun: { runId: 'run_1', accessToken: 'tok_1' },
      analysis: null,
    });

    // 16 minutes later — beyond the 15-minute window.
    vi.setSystemTime(new Date('2026-07-15T12:16:00Z'));
    expect(loadConnectState(TASK)).toBeNull();
    // Stale entry is also cleaned up.
    expect(window.sessionStorage.getItem(`browser-connect-flow:${TASK}`)).toBeNull();
  });

  it('ignores a non-resumable step', () => {
    window.sessionStorage.setItem(
      `browser-connect-flow:${TASK}`,
      JSON.stringify({ step: 'signin', url: 'x', savedAt: Date.now() }),
    );
    expect(loadConnectState(TASK)).toBeNull();
  });

  it('returns null on malformed JSON', () => {
    window.sessionStorage.setItem(`browser-connect-flow:${TASK}`, '{not json');
    expect(loadConnectState(TASK)).toBeNull();
  });

  it('clears a saved entry', () => {
    saveConnectState(TASK, {
      step: 'checking',
      url: 'https://notion.so',
      analyzeRun: { runId: 'run_1', accessToken: 'tok_1' },
      analysis: null,
    });
    clearConnectState(TASK);
    expect(loadConnectState(TASK)).toBeNull();
  });
});
