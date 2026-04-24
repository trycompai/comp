import { fireEvent, render, screen } from '@testing-library/react';
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

  it('renders one section per control group with policy rows', () => {
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

    expect(screen.getByText('Access Controls')).toBeInTheDocument();
    expect(screen.getByText('Authentication Policy')).toBeInTheDocument();
    expect(screen.getByText('MFA Policy')).toBeInTheDocument();
  });

  it('shows empty state when task has no linked controls', () => {
    mockHook.mockReturnValue({ groups: [], count: 0, isLoading: false });

    render(<TaskPolicies />);

    expect(
      screen.getByText(/no policies reference this task/i),
    ).toBeInTheDocument();
  });

  it('filters out policies that are not published, defensively', () => {
    mockHook.mockReturnValue({
      groups: [
        {
          control: { id: 'ctl_1', name: 'Access Controls' },
          policies: [
            makePolicy({ id: 'pol_1', status: 'published', name: 'Published One' }),
            makePolicy({ id: 'pol_2', status: 'draft', name: 'Draft One' }),
            makePolicy({ id: 'pol_3', status: 'archived', name: 'Archived One' }),
          ],
        },
      ],
      // API's unfiltered count disagrees with what we render; the description
      // should reflect the visible (filtered) count, not this value.
      count: 3,
      isLoading: false,
    });

    render(<TaskPolicies />);

    expect(screen.getByText('Published One')).toBeInTheDocument();
    expect(screen.queryByText('Draft One')).not.toBeInTheDocument();
    expect(screen.queryByText('Archived One')).not.toBeInTheDocument();
    expect(
      screen.getByText(/1 policy whose controls this task demonstrates\./i),
    ).toBeInTheDocument();
  });

  it('policy row links to the policy detail page', () => {
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

    const link = screen.getByRole('link', { name: /Authentication Policy/ });
    expect(link).toHaveAttribute('href', '/org_1/policies/pol_42');
  });

  it('collapses groups with more than 5 policies by default', () => {
    const manyPolicies = Array.from({ length: 7 }, (_, i) =>
      makePolicy({ id: `pol_${i}`, name: `Policy ${i}` }),
    );
    mockHook.mockReturnValue({
      groups: [{ control: { id: 'ctl_1', name: 'Access Controls' }, policies: manyPolicies }],
      count: 7,
      isLoading: false,
    });

    render(<TaskPolicies />);

    expect(screen.queryByText('Policy 0')).not.toBeInTheDocument();

    const toggle = screen.getByRole('button', { name: /show 7 policies/i });
    fireEvent.click(toggle);

    expect(screen.getByText('Policy 0')).toBeInTheDocument();
  });
});
