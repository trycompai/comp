import { apiClient } from '@/lib/api-client';
import type { Member, User } from '@db';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SWRConfig } from 'swr';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EmployeeBackgroundCheck } from './EmployeeBackgroundCheck';

const navigationMock = vi.hoisted(() => ({
  pathname: '/org_1/people/mem_1',
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
  },
}));

vi.mock('next/navigation', () => ({
  usePathname: () => navigationMock.pathname,
  useRouter: () => ({ replace: navigationMock.replace }),
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

function renderSection(props?: Partial<Parameters<typeof EmployeeBackgroundCheck>[0]>) {
  return render(
    <SWRConfig value={{ provider: () => new Map() }}>
      <EmployeeBackgroundCheck
        employee={employee}
        organizationId="org_1"
        initialBackgroundCheck={null}
        initialBillingStatus={{ hasPaymentMethod: true, setupAt: null }}
        {...props}
      />
    </SWRConfig>,
  );
}

describe('EmployeeBackgroundCheck', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    expect(screen.getByText('$99')).toBeInTheDocument();
    expect(screen.getByText('$49 per check')).toBeInTheDocument();
    expect(screen.queryByText('$49', { selector: '[data-slot=\"badge\"]' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /set up billing/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /billing settings/i })).toHaveAttribute(
      'href',
      '/org_1/settings/billing',
    );
  });

  it('skips the overview when a payment method is already saved', () => {
    renderSection();

    expect(screen.getByText('Employee Background Check')).toBeInTheDocument();
    expect(screen.getByLabelText('Personal email')).toBeInTheDocument();
    expect(
      screen.getByText('Your saved card will be charged $49 for this background check.'),
    ).toBeInTheDocument();
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

  it('starts billing setup from the overview when no payment method exists', async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.post).mockResolvedValueOnce({
      data: {},
      status: 200,
    });
    renderSection({
      initialBillingStatus: { hasPaymentMethod: false, setupAt: null },
    });

    await user.click(screen.getByRole('button', { name: /set up billing/i }));

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith(
        '/v1/background-check-billing/setup-session',
        expect.objectContaining({
          successUrl: expect.stringContaining('background_check_billing=success'),
          cancelUrl: 'http://localhost:3000/org_1/settings/billing',
        }),
        'org_1',
      );
    });
    expect(apiClient.post).toHaveBeenCalledWith(
      '/v1/background-check-billing/setup-session',
      expect.objectContaining({
        successUrl: expect.stringContaining('/org_1/settings/billing?'),
      }),
      'org_1',
    );
    expect(
      window.sessionStorage.getItem('background-check:org_1:mem_1:pending-request'),
    ).toBeNull();
  });

  it('restores the pending check after Stripe setup before completing it', async () => {
    const user = userEvent.setup();
    navigationMock.pathname = '/org_1/people/mem_1';
    navigationMock.searchParams = new URLSearchParams(
      'background_check_billing=success&background_check_step=details&session_id=cs_1',
    );
    window.sessionStorage.setItem(
      'background-check:org_1:mem_1:pending-request',
      JSON.stringify({
        organizationId: 'org_1',
        memberId: 'mem_1',
        requesterNotes: 'Recruiting requested an expedited check.',
      }),
    );
    vi.mocked(apiClient.get).mockImplementation(async (endpoint) => {
      if (endpoint === '/v1/background-check-billing/status') {
        return {
          data: { hasPaymentMethod: true, setupAt: '2026-04-29T12:00:00.000Z' },
          status: 200,
        };
      }
      return { data: null, status: 200 };
    });
    vi.mocked(apiClient.post)
      .mockResolvedValueOnce({
        data: { success: true },
        status: 200,
      })
      .mockResolvedValueOnce({
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

    renderSection({
      initialBillingStatus: { hasPaymentMethod: false, setupAt: null },
    });

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith(
        '/v1/background-check-billing/setup-success',
        { sessionId: 'cs_1' },
        'org_1',
      );
    });
    expect(apiClient.post).not.toHaveBeenCalledWith(
      '/v1/people/mem_1/background-check',
      expect.anything(),
      'org_1',
    );
    expect(await screen.findByText('Payment method saved')).toBeInTheDocument();
    expect(screen.getByLabelText('Personal email')).toHaveValue('');
    expect(
      screen.getByDisplayValue('Recruiting requested an expedited check.'),
    ).toBeInTheDocument();
    expect(window.sessionStorage.getItem('background-check:org_1:mem_1:pending-request')).toContain(
      'Recruiting requested an expedited check.',
    );

    await user.type(screen.getByLabelText('Personal email'), 'ada@example.com');
    await user.click(screen.getByRole('button', { name: /complete/i }));

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith(
        '/v1/people/mem_1/background-check',
        expect.objectContaining({
          employeeEmail: 'ada@example.com',
          requesterNotes: 'Recruiting requested an expedited check.',
        }),
        'org_1',
      );
    });
    expect(
      window.sessionStorage.getItem('background-check:org_1:mem_1:pending-request'),
    ).toBeNull();
  });

  it('shows an update payment dialog when payment fails', async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.post)
      .mockResolvedValueOnce({
        error: 'Invalid API Key provided: PLACEHOLDER',
        status: 402,
      })
      .mockResolvedValueOnce({ data: {}, status: 200 });
    renderSection();

    await user.type(screen.getByLabelText('Personal email'), 'ada@example.com');
    await user.click(screen.getByRole('button', { name: /complete/i }));

    expect(
      await screen.findByRole('heading', { name: /update payment method/i }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/PLACEHOLDER/)).not.toBeInTheDocument();
    expect(
      screen.getByText('Payment failed. Update payment method and try again.'),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /update payment method/i }));

    expect(apiClient.post).toHaveBeenCalledWith(
      '/v1/background-check-billing/portal',
      expect.objectContaining({ returnUrl: expect.stringContaining('/org_1/people/mem_1') }),
      'org_1',
    );
  });
});
