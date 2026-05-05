import { apiClient } from '@/lib/api-client';
import type { Member, User } from '@db';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SWRConfig } from 'swr';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EmployeeBackgroundCheck } from './EmployeeBackgroundCheck';

const navigationMock = vi.hoisted(() => ({
  pathname: '/org_1/people/mem_1',
  push: vi.fn(),
  replace: vi.fn(),
  searchParams: new URLSearchParams(),
}));

vi.mock('@/hooks/use-permissions', () => ({
  usePermissions: () => ({
    hasPermission: (resource: string, action: string) =>
      (resource === 'member' && action === 'update') ||
      (resource === 'organization' && action === 'update'),
  }),
}));

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

vi.mock('next/navigation', () => ({
  usePathname: () => navigationMock.pathname,
  useRouter: () => ({ push: navigationMock.push, replace: navigationMock.replace }),
  useSearchParams: () => navigationMock.searchParams,
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const employee = {
  id: 'mem_1',
  userId: 'usr_1',
  organizationId: 'org_1',
  role: 'employee',
  createdAt: new Date(),
  user: {
    id: 'usr_1',
    name: 'Ada Lovelace',
    email: 'ada@work.example',
  },
} as unknown as Member & { user: User };

const emptyBackgroundCheckDetails = {
  identityStatus: null,
  employmentStatus: null,
  referenceStatus: null,
  rightToWorkStatus: null,
  adjudicationStatus: null,
  reportSnapshot: null,
  reportSyncedAt: null,
};

const activeBackgroundCheckSubscription = {
  skuKey: 'background_checks_monthly_3',
  status: 'active',
  includedQuantity: 3,
  usedQuantity: 1,
  currentPeriodStart: '2026-04-30T00:00:00.000Z',
  currentPeriodEnd: '2026-05-30T00:00:00.000Z',
  cancelAtPeriodEnd: false,
};

function renderSection(props?: Partial<Parameters<typeof EmployeeBackgroundCheck>[0]>) {
  return render(
    <SWRConfig value={{ provider: () => new Map() }}>
      <EmployeeBackgroundCheck
        employee={employee}
        organizationId="org_1"
        initialBackgroundCheck={null}
        initialBillingStatus={{
          hasPaymentMethod: true,
          setupAt: null,
          subscriptions: [activeBackgroundCheckSubscription],
        }}
        backgroundCheckStepEnabled={true}
        memberBackgroundCheckExempt={false}
        {...props}
      />
    </SWRConfig>,
  );
}

describe('EmployeeBackgroundCheck', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    navigationMock.push.mockReset();
    vi.mocked(apiClient.get).mockReset();
    vi.mocked(apiClient.post).mockReset();
    window.sessionStorage.clear();
    navigationMock.pathname = '/org_1/people/mem_1';
    navigationMock.searchParams = new URLSearchParams();
    vi.mocked(apiClient.get).mockResolvedValue({
      data: null,
      status: 200,
    });
    vi.mocked(apiClient.post).mockResolvedValue({
      data: {
        id: 'bcr_1',
        employeeName: 'Ada Lovelace',
        employeeEmail: 'ada@example.com',
        requesterNotes: 'Recruiting requested an expedited check.',
        candidateUrl: 'https://identity.trycomp.ai/cand_1',
        status: 'invited',
        lastSyncedAt: null,
        ...emptyBackgroundCheckDetails,
      },
      status: 200,
    });
  });

  it('renders overview benefits before the form', () => {
    renderSection({
      initialBillingStatus: { hasPaymentMethod: false, setupAt: null },
    });

    expect(screen.getByText('Employee Background Check')).toBeInTheDocument();
    expect(screen.getByText('Required for Compliance')).toBeInTheDocument();
    expect(screen.getByText('Full audited report / background check')).toBeInTheDocument();
    expect(
      screen.getByText('Streamline employee background checks with Comp AI.'),
    ).toBeInTheDocument();
    expect(screen.getByText('$79 / month')).toBeInTheDocument();
    expect(screen.queryByText(/charged \$49/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /view plans/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /billing plans/i })).toHaveAttribute(
      'href',
      '/org_1/settings/billing/add-ons/background-checks',
    );
  });

  it('skips the overview when a payment method is already saved', () => {
    renderSection();

    expect(screen.getByText('Employee Background Check')).toBeInTheDocument();
    expect(screen.getByLabelText('Personal email')).toBeInTheDocument();
    expect(screen.getByText('2 background checks remaining this period.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /back/i })).not.toBeInTheDocument();
  });

  it('validates personal email before requesting', async () => {
    const user = userEvent.setup();
    renderSection();

    await user.type(screen.getByLabelText('Personal email'), 'not-an-email');
    await user.click(screen.getByRole('button', { name: /complete/i }));

    expect(await screen.findByText('Enter a valid personal email')).toBeInTheDocument();
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it('includes optional internal notes in the request payload', async () => {
    const user = userEvent.setup();
    renderSection();

    await user.type(screen.getByLabelText('Personal email'), 'ada@example.com');
    await user.type(
      screen.getByLabelText('Additional information'),
      'Recruiting requested an expedited check.',
    );
    await user.click(screen.getByRole('button', { name: /complete/i }));

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith(
        '/v1/people/mem_1/background-check',
        expect.objectContaining({
          requesterNotes: 'Recruiting requested an expedited check.',
        }),
        'org_1',
      );
    });
    expect(
      await screen.findByText(/an invitation has been sent to the employee/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/spam or junk folders/i)).toBeInTheDocument();
  });

  it('opens plan selection from the overview when no subscription exists', async () => {
    const user = userEvent.setup();
    renderSection({
      initialBillingStatus: { hasPaymentMethod: false, setupAt: null },
    });

    await user.click(screen.getByRole('button', { name: /view plans/i }));

    expect(navigationMock.push).toHaveBeenCalledWith(
      '/org_1/settings/billing/add-ons/background-checks',
    );
    expect(
      window.sessionStorage.getItem('background-check:org_1:mem_1:pending-request'),
    ).toBeNull();
  });

  it('stores the pending check details and routes to plans when allowance disappears', async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.post).mockResolvedValueOnce({
      error: 'No credits',
      status: 402,
    });
    renderSection();

    await user.type(screen.getByLabelText('Personal email'), 'ada@example.com');
    await user.type(
      screen.getByLabelText('Additional information'),
      'Recruiting requested an expedited check.',
    );
    await user.click(screen.getByRole('button', { name: /complete/i }));

    await waitFor(() => {
      expect(navigationMock.push).toHaveBeenCalledWith(
        '/org_1/settings/billing/add-ons/background-checks',
      );
    });
    expect(window.sessionStorage.getItem('background-check:org_1:mem_1:pending-request')).toBe(
      JSON.stringify({
        organizationId: 'org_1',
        memberId: 'mem_1',
        employeeName: 'Ada Lovelace',
        employeeEmail: 'ada@example.com',
        requesterNotes: 'Recruiting requested an expedited check.',
      }),
    );
  });

  it('stores pending check details instead of blocking submit when no allowance remains', async () => {
    const user = userEvent.setup();
    renderSection({
      initialBillingStatus: {
        hasPaymentMethod: true,
        setupAt: null,
        subscriptions: [
          {
            ...activeBackgroundCheckSubscription,
            usedQuantity: 3,
          },
        ],
      },
    });

    await user.type(screen.getByLabelText('Personal email'), 'ada@example.com');
    await user.type(screen.getByLabelText('Additional information'), 'Needs quick turnaround.');
    await user.click(screen.getByRole('button', { name: /complete/i }));

    await waitFor(() => {
      expect(navigationMock.push).toHaveBeenCalledWith(
        '/org_1/settings/billing/add-ons/background-checks',
      );
    });
    expect(apiClient.post).not.toHaveBeenCalled();
    expect(window.sessionStorage.getItem('background-check:org_1:mem_1:pending-request')).toBe(
      JSON.stringify({
        organizationId: 'org_1',
        memberId: 'mem_1',
        employeeName: 'Ada Lovelace',
        employeeEmail: 'ada@example.com',
        requesterNotes: 'Needs quick turnaround.',
      }),
    );
  });

  it('keeps legacy pending check drafts that do not have employee details', async () => {
    navigationMock.searchParams = new URLSearchParams({
      background_check_billing: 'success',
      session_id: 'cs_test_legacy',
    });
    window.sessionStorage.setItem(
      'background-check:org_1:mem_1:pending-request',
      JSON.stringify({
        organizationId: 'org_1',
        memberId: 'mem_1',
        requesterNotes: 'Legacy note before billing.',
      }),
    );

    renderSection();

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith(
        '/v1/background-check-billing/setup-success',
        { sessionId: 'cs_test_legacy' },
        'org_1',
      );
    });
    expect(screen.getByLabelText('Employee name')).toHaveValue('Ada Lovelace');
    expect(screen.getByLabelText('Personal email')).toHaveValue('');
    expect(screen.getByLabelText('Additional information')).toHaveValue(
      'Legacy note before billing.',
    );
    expect(
      window.sessionStorage.getItem('background-check:org_1:mem_1:pending-request'),
    ).not.toBeNull();
  });

  it('renders the bypass info card when backgroundCheckStepEnabled is false', () => {
    render(
      <EmployeeBackgroundCheck
        employee={employee}
        organizationId="org_1"
        initialBackgroundCheck={null}
        initialBillingStatus={{ hasPaymentMethod: false, setupAt: null }}
        backgroundCheckStepEnabled={false}
        memberBackgroundCheckExempt={false}
      />,
    );

    expect(screen.getByText(/background checks are not required/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /get started/i })).not.toBeInTheDocument();
  });

  it('does not fetch background-check or billing data when bypassed', async () => {
    render(
      <EmployeeBackgroundCheck
        employee={employee}
        organizationId="org_1"
        initialBackgroundCheck={null}
        initialBillingStatus={{ hasPaymentMethod: false, setupAt: null }}
        backgroundCheckStepEnabled={false}
        memberBackgroundCheckExempt={false}
      />,
    );

    // Allow any pending microtasks/SWR scheduling to settle.
    await Promise.resolve();
    await Promise.resolve();

    expect(apiClient.get).not.toHaveBeenCalled();
  });

  it('renders the exempt info card when memberBackgroundCheckExempt is true', () => {
    render(
      <EmployeeBackgroundCheck
        employee={employee}
        organizationId="org_1"
        initialBackgroundCheck={null}
        initialBillingStatus={{ hasPaymentMethod: false, setupAt: null }}
        backgroundCheckStepEnabled={true}
        memberBackgroundCheckExempt={true}
      />,
    );

    expect(
      screen.getByText(/this employee is exempt/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /get started/i }),
    ).not.toBeInTheDocument();
  });

  it('prefers the org-level bypass over per-member exempt when both are set', () => {
    render(
      <EmployeeBackgroundCheck
        employee={employee}
        organizationId="org_1"
        initialBackgroundCheck={null}
        initialBillingStatus={{ hasPaymentMethod: false, setupAt: null }}
        backgroundCheckStepEnabled={false}
        memberBackgroundCheckExempt={true}
      />,
    );

    // Org-level bypass card wins; per-member exempt toggle should not appear.
    expect(
      screen.getByText(/background checks are disabled for your organization/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('switch', { name: /exempt this employee/i }),
    ).not.toBeInTheDocument();
  });

  it('toggles exempt on and PATCHes /v1/people/:id', async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.patch).mockResolvedValue({ data: { id: 'mem_1' }, status: 200 });

    render(
      <EmployeeBackgroundCheck
        employee={employee}
        organizationId="org_1"
        initialBackgroundCheck={null}
        initialBillingStatus={{ hasPaymentMethod: false, setupAt: null }}
        backgroundCheckStepEnabled={true}
        memberBackgroundCheckExempt={false}
      />,
    );

    const toggle = screen.getByRole('switch', {
      name: /exempt this employee/i,
    });
    await user.click(toggle);

    await waitFor(() => {
      expect(apiClient.patch).toHaveBeenCalledWith(
        '/v1/people/mem_1',
        { backgroundCheckExempt: true },
        'org_1',
      );
    });
  });
});
