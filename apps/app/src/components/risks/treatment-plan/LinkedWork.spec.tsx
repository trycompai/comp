import { TaskStatus } from '@db';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LinkedWork } from './LinkedWork';

const tasks = [
  { id: 'tsk_a', title: 'Awareness training', status: TaskStatus.done, controls: [] },
  { id: 'tsk_b', title: 'Phishing simulation', status: TaskStatus.todo, controls: [] },
];

describe('LinkedWork', () => {
  it('does not render unlink buttons when onUnlinkTask is not provided', () => {
    render(<LinkedWork orgId="org_1" tasks={tasks} />);
    expect(screen.queryByLabelText(/Unlink/i)).toBeNull();
  });

  it('renders an unlink button per task when onUnlinkTask is provided', () => {
    render(<LinkedWork orgId="org_1" tasks={tasks} onUnlinkTask={vi.fn()} />);
    expect(screen.getByLabelText('Unlink Awareness training')).toBeInTheDocument();
    expect(screen.getByLabelText('Unlink Phishing simulation')).toBeInTheDocument();
  });

  it('calls onUnlinkTask with the right id when clicked', () => {
    const onUnlinkTask = vi.fn().mockResolvedValue(undefined);
    render(<LinkedWork orgId="org_1" tasks={tasks} onUnlinkTask={onUnlinkTask} />);
    fireEvent.click(screen.getByLabelText('Unlink Awareness training'));
    expect(onUnlinkTask).toHaveBeenCalledWith('tsk_a');
  });
});
