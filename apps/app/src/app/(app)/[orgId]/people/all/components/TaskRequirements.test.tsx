import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TaskRequirements, type TaskRequirementItem } from './TaskRequirements';

const count = (
  label: string,
  completed: number,
  total: number,
): TaskRequirementItem => ({ label, completed, total, kind: 'count' });

const binary = (label: string, completed: number): TaskRequirementItem => ({
  label,
  completed,
  total: 1,
  kind: 'binary',
});

describe('TaskRequirements', () => {
  it('renders a dash when there are no items and nothing loading', () => {
    render(<TaskRequirements items={[]} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('renders count requirements as "x/y"', () => {
    render(<TaskRequirements items={[count('Policies', 24, 33)]} />);
    const row = screen.getByTestId('requirement-Policies');
    expect(row).toHaveTextContent('Policies');
    expect(row).toHaveTextContent('24/33');
  });

  it('renders a complete binary requirement as Done', () => {
    render(<TaskRequirements items={[binary('Background', 1)]} />);
    expect(screen.getByTestId('requirement-Background')).toHaveTextContent('Done');
  });

  it('renders an incomplete binary requirement as Missing', () => {
    render(<TaskRequirements items={[binary('Device', 0)]} />);
    expect(screen.getByTestId('requirement-Device')).toHaveTextContent('Missing');
  });

  it('renders each requirement on its own row', () => {
    render(
      <TaskRequirements
        items={[count('Policies', 33, 33), count('Training', 5, 5), binary('Background', 1)]}
      />,
    );
    expect(screen.getByTestId('requirement-Policies')).toBeInTheDocument();
    expect(screen.getByTestId('requirement-Training')).toBeInTheDocument();
    expect(screen.getByTestId('requirement-Background')).toBeInTheDocument();
  });

  it('shows a loading placeholder when showLoadingRow is set with no items', () => {
    render(<TaskRequirements items={[]} showLoadingRow />);
    expect(screen.queryByText('—')).not.toBeInTheDocument();
  });

  it('renders an explicit not-provided state distinctly from Missing', () => {
    render(
      <TaskRequirements
        items={[{ label: '2FA', completed: 0, total: 1, kind: 'binary', state: 'not-provided' }]}
      />,
    );
    const row = screen.getByTestId('requirement-2FA');
    expect(row).toHaveTextContent('Not provided');
    expect(row).not.toHaveTextContent('Missing');
  });

  it('lets an explicit state override the completed/total derivation', () => {
    render(
      <TaskRequirements
        items={[{ label: '2FA', completed: 0, total: 1, kind: 'binary', state: 'done' }]}
      />,
    );
    expect(screen.getByTestId('requirement-2FA')).toHaveTextContent('Done');
  });
});
