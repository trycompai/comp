import { TaskStatus } from '@db';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AutoLinkSuggestions, type LinkedTask } from './AutoLinkSuggestions';

vi.mock('sonner', () => ({ toast: { info: vi.fn(), success: vi.fn(), error: vi.fn() } }));

const realtimeRunMock = vi.fn();
vi.mock('@trigger.dev/react-hooks', () => ({
  useRealtimeRun: (runId: string, opts: { accessToken?: string; enabled?: boolean }) =>
    realtimeRunMock(runId, opts),
}));

afterEach(() => {
  realtimeRunMock.mockReset();
});

const linkedTask: LinkedTask = {
  id: 'tsk_existing',
  title: 'Existing task',
  status: TaskStatus.todo,
  controls: [{ id: 'ctl_existing', name: 'Existing control' }],
};

function defaultProps() {
  return {
    orgId: 'org_1',
    canUpdate: true,
    tasks: [] as LinkedTask[],
    onSuggest: vi.fn().mockResolvedValue({ runId: 'r1', publicAccessToken: 't1' }),
    onApply: vi.fn().mockResolvedValue(undefined),
    onAfterApply: vi.fn().mockResolvedValue(undefined),
    onUnlinkTask: vi.fn().mockResolvedValue(undefined),
  };
}

describe('AutoLinkSuggestions', () => {
  it('renders the empty state when no tasks are linked', () => {
    realtimeRunMock.mockReturnValue({ run: null });
    render(<AutoLinkSuggestions {...defaultProps()} />);
    expect(screen.getByRole('button', { name: /Suggest with AI/i })).toBeInTheDocument();
    expect(screen.getByText(/No tasks or controls linked yet/i)).toBeInTheDocument();
  });

  it('renders the linked state with Re-assess affordance when tasks exist', () => {
    realtimeRunMock.mockReturnValue({ run: null });
    render(<AutoLinkSuggestions {...defaultProps()} tasks={[linkedTask]} />);
    expect(screen.getByText('Existing task')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Re-assess/i })).toBeInTheDocument();
  });

  it('calls onSuggest when "Suggest with AI" is clicked', async () => {
    realtimeRunMock.mockReturnValue({ run: null });
    const props = defaultProps();
    render(<AutoLinkSuggestions {...props} />);
    fireEvent.click(screen.getByRole('button', { name: /Suggest with AI/i }));
    await waitFor(() => {
      expect(props.onSuggest).toHaveBeenCalledTimes(1);
    });
  });

  it('transitions to suggestions when the run completes with output', async () => {
    realtimeRunMock.mockReturnValue({
      run: {
        status: 'COMPLETED',
        output: {
          suggestions: {
            tasks: [
              { id: 'tsk_a', title: 'Suggested A', status: 'todo', score: 0.9 },
              { id: 'tsk_b', title: 'Suggested B', status: 'todo', score: 0.7 },
            ],
            controls: [],
          },
        },
      },
    });
    const props = defaultProps();
    render(<AutoLinkSuggestions {...props} />);
    fireEvent.click(screen.getByRole('button', { name: /Suggest with AI/i }));

    await waitFor(() => {
      expect(screen.getByText(/AI found/i)).toBeInTheDocument();
    });
    expect(screen.getByText('Suggested A')).toBeInTheDocument();
    expect(screen.getByText('Suggested B')).toBeInTheDocument();
    // Both default-checked → Link 2.
    expect(screen.getByRole('button', { name: /^Link 2$/i })).toBeInTheDocument();
  });

  it('updates the Link N count when a task is unchecked', async () => {
    realtimeRunMock.mockReturnValue({
      run: {
        status: 'COMPLETED',
        output: {
          suggestions: {
            tasks: [
              { id: 'tsk_a', title: 'Suggested A', status: 'todo', score: 0.9 },
              { id: 'tsk_b', title: 'Suggested B', status: 'todo', score: 0.7 },
            ],
            controls: [],
          },
        },
      },
    });
    const props = defaultProps();
    render(<AutoLinkSuggestions {...props} />);
    fireEvent.click(screen.getByRole('button', { name: /Suggest with AI/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^Link 2$/i })).toBeInTheDocument();
    });

    // Click the row for "Suggested A" — the row itself is the toggle.
    fireEvent.click(screen.getByRole('button', { name: /Uncheck task Suggested A/i }));
    expect(screen.getByRole('button', { name: /^Link 1$/i })).toBeInTheDocument();
  });

  it('calls onApply with selected ids and replace=false in fresh mode', async () => {
    realtimeRunMock.mockReturnValue({
      run: {
        status: 'COMPLETED',
        output: {
          suggestions: {
            tasks: [
              { id: 'tsk_a', title: 'Suggested A', status: 'todo', score: 0.9 },
            ],
            controls: [],
          },
        },
      },
    });
    const props = defaultProps();
    render(<AutoLinkSuggestions {...props} />);
    fireEvent.click(screen.getByRole('button', { name: /Suggest with AI/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^Link 1$/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /^Link 1$/i }));
    await waitFor(() => {
      expect(props.onApply).toHaveBeenCalledWith({ taskIds: ['tsk_a'], replace: false });
    });
  });

  it('calls onApply with replace=true when launched from the Re-assess button', async () => {
    realtimeRunMock.mockReturnValue({
      run: {
        status: 'COMPLETED',
        output: {
          suggestions: {
            tasks: [{ id: 'tsk_a', title: 'A', status: 'todo', score: 0.9 }],
            controls: [],
          },
        },
      },
    });
    const props = defaultProps();
    render(<AutoLinkSuggestions {...props} tasks={[linkedTask]} />);

    fireEvent.click(screen.getByRole('button', { name: /Re-assess/i }));
    await waitFor(() => {
      expect(props.onSuggest).toHaveBeenCalled();
    });
    // After the realtime "completed" event, suggestions render with mode=reassess.
    await waitFor(() => {
      expect(screen.getByText(/AI found/i)).toBeInTheDocument();
    });

    // 1 AI-suggested + 1 currently-linked (merged) → 2 checked.
    fireEvent.click(screen.getByRole('button', { name: /^Link 2$/i }));
    await waitFor(() => {
      expect(props.onApply).toHaveBeenCalledWith({
        taskIds: expect.arrayContaining(['tsk_a', 'tsk_existing']),
        replace: true,
      });
    });
  });

  it('renders read-only controls section with derived dimming', async () => {
    realtimeRunMock.mockReturnValue({
      run: {
        status: 'COMPLETED',
        output: {
          suggestions: {
            tasks: [{ id: 'tsk_a', title: 'A', status: 'todo', score: 0.9 }],
            controls: [
              {
                id: 'ctl_1',
                code: 'CC1.1',
                name: 'Awareness',
                framework: 'SOC 2',
                score: 0.9,
                viaTaskIds: ['tsk_a'],
              },
            ],
          },
        },
      },
    });
    const props = defaultProps();
    render(<AutoLinkSuggestions {...props} />);
    fireEvent.click(screen.getByRole('button', { name: /Suggest with AI/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/These controls will be linked through the selected tasks/i),
      ).toBeInTheDocument();
    });
    expect(screen.getByText(/CC1.1 · Awareness/i)).toBeInTheDocument();
  });

  it('returns to the prior state when Discard is clicked', async () => {
    realtimeRunMock.mockReturnValue({
      run: {
        status: 'COMPLETED',
        output: {
          suggestions: {
            tasks: [{ id: 'tsk_a', title: 'A', status: 'todo', score: 0.9 }],
            controls: [],
          },
        },
      },
    });
    const props = defaultProps();
    render(<AutoLinkSuggestions {...props} />);
    fireEvent.click(screen.getByRole('button', { name: /Suggest with AI/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^Link 1$/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /^Discard$/i }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Suggest with AI/i })).toBeInTheDocument();
    });
  });
});
