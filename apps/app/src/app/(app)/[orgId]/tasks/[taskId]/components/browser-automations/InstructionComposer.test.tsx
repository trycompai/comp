import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const startTest = vi.fn();
const closeTestSession = vi.fn();

vi.mock('../../hooks/useInstructionTest', () => ({
  useInstructionTest: () => ({ startTest, closeTestSession, isStarting: false }),
}));

vi.mock('@trigger.dev/react-hooks', () => ({
  useRealtimeRun: () => ({ run: undefined, error: undefined }),
}));

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() } }));

import { InstructionComposer, type ConnectionRef } from './InstructionComposer';

const connection: ConnectionRef = {
  profileId: 'prof_1',
  hostname: 'app.example.com',
  displayName: 'Statushub',
  url: 'https://app.example.com',
  status: 'verified',
};

const baseProps = {
  taskId: 'task_1',
  connection,
  isSaving: false,
  onCancel: vi.fn(),
  onCreate: vi.fn().mockResolvedValue(true),
  onUpdate: vi.fn().mockResolvedValue(true),
  onSaved: vi.fn(),
};

describe('InstructionComposer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    startTest.mockResolvedValue({
      runId: 'run_1',
      publicAccessToken: 'tok',
      sessionId: 'sess_1',
      liveViewUrl: 'https://live/view',
    });
  });

  it('renders the connection chip (hostname) and create heading', () => {
    render(<InstructionComposer {...baseProps} mode="create" />);
    expect(screen.getByText('New instruction')).toBeInTheDocument();
    expect(screen.getByText('app.example.com')).toBeInTheDocument();
  });

  it('tests the instruction against the connection URL', async () => {
    render(<InstructionComposer {...baseProps} mode="create" />);
    fireEvent.change(screen.getByPlaceholderText(/screenshot the two-factor/i), {
      target: { value: 'Screenshot the MFA policy' },
    });
    fireEvent.click(screen.getByRole('button', { name: /test instruction/i }));

    await waitFor(() => expect(startTest).toHaveBeenCalledTimes(1));
    expect(startTest).toHaveBeenCalledWith({
      profileId: 'prof_1',
      targetUrl: 'https://app.example.com',
      instruction: 'Screenshot the MFA policy',
      evaluationCriteria: undefined,
      taskId: 'task_1',
    });
  });

  it('sends the pass/fail check when the criteria field is filled', async () => {
    render(<InstructionComposer {...baseProps} mode="create" />);
    fireEvent.change(screen.getByPlaceholderText(/screenshot the two-factor/i), {
      target: { value: 'Capture security page' },
    });
    // The check field is always visible now (no opt-in toggle).
    fireEvent.change(screen.getByPlaceholderText(/two-factor authentication is enforced/i), {
      target: { value: 'MFA is on' },
    });
    fireEvent.click(screen.getByRole('button', { name: /test instruction/i }));

    await waitFor(() => expect(startTest).toHaveBeenCalledTimes(1));
    expect(startTest.mock.calls[0][0].evaluationCriteria).toBe('MFA is on');
  });

  it('leaves the check off (capture-only) when the criteria field is empty', async () => {
    render(<InstructionComposer {...baseProps} mode="create" />);
    fireEvent.change(screen.getByPlaceholderText(/screenshot the two-factor/i), {
      target: { value: 'Capture security page' },
    });
    fireEvent.click(screen.getByRole('button', { name: /test instruction/i }));

    await waitFor(() => expect(startTest).toHaveBeenCalledTimes(1));
    expect(startTest.mock.calls[0][0].evaluationCriteria).toBeUndefined();
  });

  it('fills a field from an example chip', async () => {
    render(<InstructionComposer {...baseProps} mode="create" />);
    fireEvent.click(screen.getByRole('button', { name: 'MFA enforced' }));
    expect(
      screen.getByDisplayValue('Two-factor authentication is enforced for all members.'),
    ).toBeInTheDocument();
  });

  it('reveals the advanced start URL override', () => {
    render(<InstructionComposer {...baseProps} mode="create" />);
    expect(screen.queryByPlaceholderText('https://app.example.com')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText(/advanced — start from a specific page/i));
    expect(screen.getByPlaceholderText('https://app.example.com')).toBeInTheDocument();
  });

  it('saves an edited instruction with a derived name', async () => {
    const onUpdate = vi.fn().mockResolvedValue(true);
    render(
      <InstructionComposer
        {...baseProps}
        mode="edit"
        onUpdate={onUpdate}
        initialValues={{
          id: 'auto_1',
          instruction: 'Screenshot the billing page',
          evaluationCriteria: null,
          targetUrl: 'https://app.example.com',
        }}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /save instruction/i }));

    await waitFor(() => expect(onUpdate).toHaveBeenCalledTimes(1));
    expect(onUpdate).toHaveBeenCalledWith({
      automationId: 'auto_1',
      input: {
        name: 'Screenshot the billing page',
        targetUrl: 'https://app.example.com',
        instruction: 'Screenshot the billing page',
        evaluationCriteria: undefined,
      },
    });
  });
});
