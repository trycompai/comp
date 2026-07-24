import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { LoginAnalysis } from '../../hooks/types';
import {
  clearConnectState,
  loadConnectState,
  saveConnectState,
} from './connect-flow-storage';

const TASK = 'tsk_123';

const analysis: LoginAnalysis = {
  reachable: true,
  detectedMethods: ['password'],
  identifierType: 'email',
  extraFields: [],
  recommendation: { category: 'ready', headline: 'Ready', detail: 'All set' },
};

describe('connect-flow-storage', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('round-trips a saved choose phase (with the analysis result)', () => {
    saveConnectState(TASK, { step: 'choose', url: 'https://notion.so', analysis });

    const loaded = loadConnectState(TASK);
    expect(loaded?.step).toBe('choose');
    expect(loaded?.url).toBe('https://notion.so');
    expect(loaded?.analysis?.recommendation.category).toBe('ready');
  });

  it('round-trips a saved enter-url phase (just the URL)', () => {
    saveConnectState(TASK, { step: 'enter-url', url: 'https://notion.so', analysis: null });

    const loaded = loadConnectState(TASK);
    expect(loaded?.step).toBe('enter-url');
    expect(loaded?.url).toBe('https://notion.so');
  });

  it('returns null when nothing is saved', () => {
    expect(loadConnectState(TASK)).toBeNull();
  });

  it('is scoped per task', () => {
    saveConnectState(TASK, { step: 'enter-url', url: 'https://notion.so', analysis: null });
    expect(loadConnectState('tsk_other')).toBeNull();
    expect(loadConnectState(TASK)).not.toBeNull();
  });

  it('discards a choose entry with no analysis to show', () => {
    saveConnectState(TASK, { step: 'choose', url: 'https://notion.so', analysis: null });
    expect(loadConnectState(TASK)).toBeNull();
  });

  it('discards an enter-url entry with no URL', () => {
    saveConnectState(TASK, { step: 'enter-url', url: '', analysis: null });
    expect(loadConnectState(TASK)).toBeNull();
  });

  it('discards a stale entry past the resume window', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-15T12:00:00Z'));
    saveConnectState(TASK, { step: 'enter-url', url: 'https://notion.so', analysis: null });

    // 61 minutes later — beyond the 60-minute window.
    vi.setSystemTime(new Date('2026-07-15T13:01:00Z'));
    expect(loadConnectState(TASK)).toBeNull();
    expect(window.sessionStorage.getItem(`browser-connect-flow:${TASK}`)).toBeNull();
  });

  it('ignores a non-resumable step (e.g. a live sign-in)', () => {
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
    saveConnectState(TASK, { step: 'enter-url', url: 'https://notion.so', analysis: null });
    clearConnectState(TASK);
    expect(loadConnectState(TASK)).toBeNull();
  });
});
