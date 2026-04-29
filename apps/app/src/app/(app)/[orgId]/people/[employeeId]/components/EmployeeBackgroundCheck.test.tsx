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

    expect(screen.getByText('Streamline background checks now in Comp AI')).toBeInTheDocument();
    expect(screen.getByText('Full audited report / background check')).toBeInTheDocument();
    expect(screen.queryByText('Launch pricing')).not.toBeInTheDocument();
    expect(screen.queryByText('$49')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /get started/i })).toBeInTheDocument();
  });

  it('skips the overview when a payment method is already saved', () => {
    renderSection();

    expect(
      screen.queryByText('Streamline background checks now in Comp AI'),
    ).not.toBeInTheDocument();
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
  });

  it('starts billing setup from Complete when no payment method exists', async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.post).mockResolvedValueOnce({
      data: {},
      status: 200,
    });
    renderSection({
      initialBillingStatus: { hasPaymentMethod: false, setupAt: null },
    });

    await user.click(screen.getByRole('button', { name: /get started/i }));
    await user.type(screen.getByLabelText('Personal email'), 'ada@example.com');
    await user.click(screen.getByRole('button', { name: /complete/i }));

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith(
        '/v1/background-check-billing/setup-session',
        expect.objectContaining({
          successUrl: expect.stringContaining('background_check_billing=success'),
          cancelUrl: expect.stringContaining('background_check_step=details'),
        }),
        'org_1',
      );
    });
    expect(apiClient.post).toHaveBeenCalledWith(
      '/v1/background-check-billing/setup-session',
      expect.objectContaining({
        successUrl: expect.stringContaining('/org_1/people/mem_1?'),
      }),
      'org_1',
    );
    expect(window.sessionStorage.getItem('background-check:org_1:mem_1:pending-request')).toContain(
      'ada@example.com',
    );
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
        employeeName: 'Ada Lovelace',
        employeeEmail: 'ada@example.com',
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
    expect(screen.getByDisplayValue('ada@example.com')).toBeInTheDocument();
    expect(window.sessionStorage.getItem('background-check:org_1:mem_1:pending-request')).toContain(
      'ada@example.com',
    );

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
        error: 'Background check payment failed. Update billing and try again.',
        status: 402,
      })
      .mockResolvedValueOnce({ data: {}, status: 200 });
    renderSection();

    await user.type(screen.getByLabelText('Personal email'), 'ada@example.com');
    await user.click(screen.getByRole('button', { name: /complete/i }));

    expect(
      await screen.findByRole('heading', { name: /update payment method/i }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /update payment method/i }));

    expect(apiClient.post).toHaveBeenCalledWith(
      '/v1/background-check-billing/portal',
      expect.objectContaining({ returnUrl: expect.stringContaining('/org_1/people/mem_1') }),
      'org_1',
    );
  });
});
