import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useTaskAutomationExecution } from './use-task-automation-execution';

// --- Mocks -----------------------------------------------------------------

vi.mock('next/navigation', () => ({
  useParams: () => ({ orgId: 'org_1', taskId: 'task_1', automationId: 'auto_1' }),
}));

const getAutomationRunStatus = vi.fn();
vi.mock('../actions/task-automation-actions', () => ({
  getAutomationRunStatus: (runId: string) => getAutomationRunStatus(runId),
}));

// sanitizeErrorMessage just passes the message through so we can assert on it.
vi.mock('../actions/sanitize-error', () => ({
  sanitizeErrorMessage: vi.fn(async (err: unknown) => {
    if (typeof err === 'string') return err;
    if (err && typeof err === 'object' && 'message' in err) {
      return String((err as { message: unknown }).message);
    }
    return 'sanitized';
  }),
}));

vi.mock('../lib/chat-context', () => ({
  useSharedChatContext: () => ({ automationIdRef: { current: 'auto_1' } }),
}));

const executeScript = vi.fn();
vi.mock('../lib/task-automation-api', () => ({
  taskAutomationApi: {
    execution: {
      executeScript: (data: unknown) => executeScript(data),
    },
  },
}));

// --- Helpers ---------------------------------------------------------------

const runStatus = (status: string, output?: unknown) => ({
  success: true,
  data: { id: 'run_1', status, ...(output !== undefined ? { output } : {}) },
});

const okOutput = {
  success: true,
  output: { ok: true },
  summary: 'It worked',
  evaluationStatus: 'pass' as const,
  evaluationReason: 'criteria met',
};

beforeEach(() => {
  executeScript.mockResolvedValue({ runId: 'run_1' });
  getAutomationRunStatus.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe('useTaskAutomationExecution polling', () => {
  it('resolves to success when the run COMPLETES with output', async () => {
    getAutomationRunStatus.mockResolvedValue(runStatus('COMPLETED', okOutput));

    const { result } = renderHook(() => useTaskAutomationExecution());
    await act(async () => {
      await result.current.execute();
    });

    await waitFor(() => expect(result.current.isExecuting).toBe(false));
    expect(result.current.error).toBeNull();
    expect(result.current.result).toMatchObject({
      success: true,
      data: { ok: true },
      summary: 'It worked',
      evaluationStatus: 'pass',
    });
  });

  // Regression: a COMPLETED run whose output is missing used to fall through
  // the `COMPLETED && data.output` guard and poll forever.
  it('resolves to success when the run COMPLETES without output', async () => {
    getAutomationRunStatus.mockResolvedValue(runStatus('COMPLETED'));

    const { result } = renderHook(() => useTaskAutomationExecution());
    await act(async () => {
      await result.current.execute();
    });

    await waitFor(() => expect(result.current.isExecuting).toBe(false));
    expect(result.current.error).toBeNull();
    expect(result.current.result).toMatchObject({ success: true });
    expect(result.current.result?.data).toBeUndefined();
  });

  it('surfaces an error when the run FAILS', async () => {
    getAutomationRunStatus.mockResolvedValue({
      success: true,
      data: { id: 'run_1', status: 'FAILED', error: 'boom from script' },
    });

    const { result } = renderHook(() => useTaskAutomationExecution());
    await act(async () => {
      await result.current.execute();
    });

    await waitFor(() => expect(result.current.isExecuting).toBe(false));
    expect(result.current.result).toBeNull();
    expect(result.current.error?.message).toBe('boom from script');
  });

  // Regression: these terminal states used to fall into the infinite poll
  // (the bug: "Running your automation" forever).
  it.each([
    ['TIMED_OUT', /timed out/i],
    ['CRASHED', /crashed/i],
    ['SYSTEM_FAILURE', /system error/i],
    ['CANCELED', /canceled/i],
    ['EXPIRED', /expired/i],
  ])('stops polling and surfaces an error for terminal status %s', async (status, expected) => {
    getAutomationRunStatus.mockResolvedValue(runStatus(status));

    const { result } = renderHook(() => useTaskAutomationExecution());
    await act(async () => {
      await result.current.execute();
    });

    await waitFor(() => expect(result.current.isExecuting).toBe(false));
    expect(result.current.result).toBeNull();
    expect(result.current.error?.message).toMatch(expected);
  });

  // Regression: an unknown / unmapped status must NOT loop forever.
  it('treats an unknown status as terminal instead of polling forever', async () => {
    getAutomationRunStatus.mockResolvedValue(runStatus('SOME_FUTURE_STATUS'));

    const { result } = renderHook(() => useTaskAutomationExecution());
    await act(async () => {
      await result.current.execute();
    });

    await waitFor(() => expect(result.current.isExecuting).toBe(false));
    expect(result.current.error?.message).toMatch(/did not finish successfully/i);
  });

  it('keeps polling through in-progress states then resolves on COMPLETED', async () => {
    vi.useFakeTimers();
    getAutomationRunStatus
      .mockResolvedValueOnce(runStatus('QUEUED'))
      .mockResolvedValueOnce(runStatus('EXECUTING'))
      .mockResolvedValue(runStatus('COMPLETED', okOutput));

    const { result } = renderHook(() => useTaskAutomationExecution());
    await act(async () => {
      await result.current.execute();
    });
    // Advance through the two 1s poll intervals.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2500);
    });

    expect(result.current.isExecuting).toBe(false);
    expect(result.current.result).toMatchObject({ success: true, data: { ok: true } });
    expect(getAutomationRunStatus.mock.calls.length).toBeGreaterThanOrEqual(3);
  });

  // Regression: a run stuck in the queue (never reaches a terminal state) must
  // not spin forever — the absolute deadline backstop ends it with an error.
  it('gives up with a timeout error if the run never leaves an in-progress state', async () => {
    vi.useFakeTimers();
    getAutomationRunStatus.mockResolvedValue(runStatus('QUEUED'));

    const { result } = renderHook(() => useTaskAutomationExecution());
    await act(async () => {
      await result.current.execute();
    });
    // Advance past the 6-minute backstop.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(6 * 60 * 1000 + 5000);
    });

    expect(result.current.isExecuting).toBe(false);
    expect(result.current.error?.message).toMatch(/taking longer than expected/i);
  });

  // Robustness: even if a single status request never resolves (the API stalls
  // mid-request), the independent backstop timer must still end the run.
  it('gives up via the backstop even if a status request never resolves', async () => {
    vi.useFakeTimers();
    getAutomationRunStatus.mockImplementation(() => new Promise(() => {}));

    const { result } = renderHook(() => useTaskAutomationExecution());
    await act(async () => {
      await result.current.execute();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(6 * 60 * 1000 + 5000);
    });

    expect(result.current.isExecuting).toBe(false);
    expect(result.current.error?.message).toMatch(/taking longer than expected/i);
  });
});
