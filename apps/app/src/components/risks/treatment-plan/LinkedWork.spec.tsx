import { TaskStatus } from '@db';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LinkedWork } from './LinkedWork';

const tasks = [
  { id: 'tsk_a', title: 'Awareness training', status: TaskStatus.done, controls: [] },
  { id: 'tsk_b', title: 'Phishing simulation', status: TaskStatus.todo, controls: [] },
];

describe('LinkedWork', () => {
  it('renders task titles as links that open in a new tab', () => {
    render(<LinkedWork orgId="org_1" tasks={tasks} />);
    const a = screen.getByRole('link', { name: /Awareness training/i });
    expect(a).toHaveAttribute('href', '/org_1/tasks/tsk_a');
    expect(a).toHaveAttribute('target', '_blank');
    const b = screen.getByRole('link', { name: /Phishing simulation/i });
    expect(b).toHaveAttribute('target', '_blank');
  });

  it('marks incomplete tasks visually distinct from done tasks', () => {
    render(<LinkedWork orgId="org_1" tasks={tasks} />);
    // Done task gets line-through styling on its title.
    const done = screen.getByRole('link', { name: /Awareness training/i });
    expect(done.className).toMatch(/line-through/);
    const incomplete = screen.getByRole('link', { name: /Phishing simulation/i });
    expect(incomplete.className).not.toMatch(/line-through/);
  });

  it('derives controls completeness from parent tasks', () => {
    const linkedTasks = [
      {
        id: 'tsk_a',
        title: 'A',
        status: TaskStatus.done,
        controls: [{ id: 'c1', name: 'Awareness Training' }],
      },
      {
        id: 'tsk_b',
        title: 'B',
        status: TaskStatus.todo,
        controls: [{ id: 'c1', name: 'Awareness Training' }],
      },
    ];
    render(<LinkedWork orgId="org_1" tasks={linkedTasks} />);
    // Control c1 has one done + one todo parent → not complete.
    const control = screen.getByRole('link', { name: /Awareness Training/i });
    expect(control.className).not.toMatch(/line-through/);
  });
});
