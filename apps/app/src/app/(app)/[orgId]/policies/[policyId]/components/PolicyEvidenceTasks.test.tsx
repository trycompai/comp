import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PolicyEvidenceTasks } from './PolicyEvidenceTasks';
import type { PolicyEvidenceTaskGroup } from '../hooks/usePolicyEvidenceTasks';

vi.mock('next/navigation', () => ({
  useParams: () => ({ orgId: 'org_1', policyId: 'pol_1' }),
}));

const mockHook = vi.fn();
vi.mock('../hooks/usePolicyEvidenceTasks', () => ({
  usePolicyEvidenceTasks: (...args: unknown[]) => mockHook(...args),
}));

const makeTask = (overrides: Partial<PolicyEvidenceTaskGroup['tasks'][number]> = {}) => ({
  id: 'tsk_1',
  title: 'Enable 2FA',
  status: 'in_progress',
  frequency: 'monthly',
  department: 'it',
  automationStatus: 'MANUAL' as const,
  assigneeId: null,
  ...overrides,
});

describe('PolicyEvidenceTasks', () => {
  beforeEach(() => {
    mockHook.mockReset();
  });

  it('renders one section per control group with task rows', () => {
    mockHook.mockReturnValue({
      groups: [
        {
          control: { id: 'ctl_1', name: 'Access Controls' },
          tasks: [makeTask(), makeTask({ id: 'tsk_2', title: 'Review access logs' })],
        },
        {
          control: { id: 'ctl_2', name: 'Monitoring' },
          tasks: [makeTask({ id: 'tsk_3', title: 'Check alerts' })],
        },
      ],
      count: 3,
      isLoading: false,
    });

    render(<PolicyEvidenceTasks />);

    expect(screen.getByText('Access Controls')).toBeInTheDocument();
    expect(screen.getByText('Monitoring')).toBeInTheDocument();
    expect(screen.getByText('Enable 2FA')).toBeInTheDocument();
    expect(screen.getByText('Review access logs')).toBeInTheDocument();
    expect(screen.getByText('Check alerts')).toBeInTheDocument();
  });

  it('shows page-level empty state when policy has no controls', () => {
    mockHook.mockReturnValue({ groups: [], count: 0, isLoading: false });

    render(<PolicyEvidenceTasks />);

    expect(
      screen.getByText(/map at least one control/i),
    ).toBeInTheDocument();
  });

  it('shows page-level empty state when every mapped control has no tasks', () => {
    mockHook.mockReturnValue({
      groups: [{ control: { id: 'ctl_1', name: 'Access Controls' }, tasks: [] }],
      count: 0,
      isLoading: false,
    });

    render(<PolicyEvidenceTasks />);

    expect(
      screen.getByText(/map at least one control/i),
    ).toBeInTheDocument();
  });

  it('hides empty groups silently when other groups have tasks', () => {
    mockHook.mockReturnValue({
      groups: [
        {
          control: { id: 'ctl_1', name: 'Access Controls' },
          tasks: [makeTask({ id: 'tsk_1', title: 'Enable 2FA' })],
        },
        { control: { id: 'ctl_2', name: 'Endpoint Security' }, tasks: [] },
      ],
      count: 1,
      isLoading: false,
    });

    render(<PolicyEvidenceTasks />);

    expect(screen.getByText('Access Controls')).toBeInTheDocument();
    expect(screen.queryByText('Endpoint Security')).not.toBeInTheDocument();
    expect(
      screen.queryByText(/controls without tasks/i),
    ).not.toBeInTheDocument();
  });

  it('task row links to the task detail page', () => {
    mockHook.mockReturnValue({
      groups: [
        {
          control: { id: 'ctl_1', name: 'Access Controls' },
          tasks: [makeTask({ id: 'tsk_42', title: 'Enable 2FA' })],
        },
      ],
      count: 1,
      isLoading: false,
    });

    render(<PolicyEvidenceTasks />);

    const link = screen.getByRole('link', { name: /Enable 2FA/ });
    expect(link).toHaveAttribute('href', '/org_1/tasks/tsk_42');
  });

  it('renders error state when the hook returns an error', () => {
    mockHook.mockReturnValue({
      groups: [],
      count: 0,
      isLoading: false,
      error: new Error('boom'),
    });

    render(<PolicyEvidenceTasks />);

    expect(
      screen.getByText(/could not load evidence tasks/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/map at least one control/i),
    ).not.toBeInTheDocument();
  });

  it('collapses groups with more than 5 tasks by default', () => {
    const manyTasks = Array.from({ length: 7 }, (_, i) =>
      makeTask({ id: `tsk_${i}`, title: `Task ${i}` }),
    );
    mockHook.mockReturnValue({
      groups: [{ control: { id: 'ctl_1', name: 'Access Controls' }, tasks: manyTasks }],
      count: 7,
      isLoading: false,
    });

    render(<PolicyEvidenceTasks />);

    // By default, task titles should not be visible
    expect(screen.queryByText('Task 0')).not.toBeInTheDocument();

    const toggle = screen.getByRole('button', { name: /show 7 tasks/i });
    fireEvent.click(toggle);

    expect(screen.getByText('Task 0')).toBeInTheDocument();
  });
});
