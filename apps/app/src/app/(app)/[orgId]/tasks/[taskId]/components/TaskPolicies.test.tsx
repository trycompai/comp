import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TaskPolicies } from './TaskPolicies';
import type { TaskPolicyGroup } from '../hooks/use-task-policies';

vi.mock('next/navigation', () => ({
  useParams: () => ({ orgId: 'org_1', taskId: 'tsk_1' }),
}));

const mockHook = vi.fn();
vi.mock('../hooks/use-task-policies', () => ({
  useTaskPolicies: (...args: unknown[]) => mockHook(...args),
}));

const makePolicy = (overrides: Partial<TaskPolicyGroup['policies'][number]> = {}) => ({
  id: 'pol_1',
  name: 'Authentication Policy',
  status: 'published',
  frequency: 'yearly',
  department: 'it',
  ...overrides,
});

describe('TaskPolicies', () => {
  beforeEach(() => {
    mockHook.mockReset();
  });

  it('renders one row per (control, policy) pair with policy and control names', () => {
    mockHook.mockReturnValue({
      groups: [
        {
          control: { id: 'ctl_1', name: 'Access Controls' },
          policies: [makePolicy(), makePolicy({ id: 'pol_2', name: 'MFA Policy' })],
        },
      ],
      count: 2,
      isLoading: false,
    });

    render(<TaskPolicies />);

    expect(screen.getByText('Authentication Policy')).toBeInTheDocument();
    expect(screen.getByText('MFA Policy')).toBeInTheDocument();
    // Control name appears once per row in the Control column.
    expect(screen.getAllByText('Access Controls')).toHaveLength(2);
  });

  it('renders all policies returned by the API, including drafts', () => {
    // The API is authoritative on what to show; the component does not filter
    // by status. Both draft and published policies should appear.
    mockHook.mockReturnValue({
      groups: [
        {
          control: { id: 'ctl_1', name: 'Access Controls' },
          policies: [
            makePolicy({ id: 'pol_1', status: 'published', name: 'Published One' }),
            makePolicy({ id: 'pol_2', status: 'draft', name: 'Draft One' }),
          ],
        },
      ],
      count: 2,
      isLoading: false,
    });

    render(<TaskPolicies />);

    expect(screen.getByText('Published One')).toBeInTheDocument();
    expect(screen.getByText('Draft One')).toBeInTheDocument();
  });

  it('shows empty state when task has no linked controls', () => {
    mockHook.mockReturnValue({ groups: [], count: 0, isLoading: false });

    render(<TaskPolicies />);

    expect(
      screen.getByText(/no policies reference this task/i),
    ).toBeInTheDocument();
  });

  it('renders policy and control cells as links that open in a new tab', () => {
    mockHook.mockReturnValue({
      groups: [
        {
          control: { id: 'ctl_1', name: 'Access Controls' },
          policies: [makePolicy({ id: 'pol_42', name: 'Authentication Policy' })],
        },
      ],
      count: 1,
      isLoading: false,
    });

    render(<TaskPolicies />);

    const policyLink = screen.getByText('Authentication Policy').closest('a');
    expect(policyLink).not.toBeNull();
    expect(policyLink).toHaveAttribute('href', '/org_1/policies/pol_42');
    expect(policyLink).toHaveAttribute('target', '_blank');
    expect(policyLink).toHaveAttribute('rel', 'noopener noreferrer');

    const controlLink = screen.getByText('Access Controls').closest('a');
    expect(controlLink).not.toBeNull();
    expect(controlLink).toHaveAttribute('href', '/org_1/controls/ctl_1');
    expect(controlLink).toHaveAttribute('target', '_blank');
    expect(controlLink).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('renders error state when the hook returns an error', () => {
    mockHook.mockReturnValue({
      groups: [],
      count: 0,
      isLoading: false,
      error: new Error('boom'),
    });

    render(<TaskPolicies />);

    expect(
      screen.getByText(/could not load policies/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/no policies reference this task/i),
    ).not.toBeInTheDocument();
  });
});
