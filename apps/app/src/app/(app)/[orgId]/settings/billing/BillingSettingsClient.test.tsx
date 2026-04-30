import { apiClient } from '@/lib/api-client';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SWRConfig } from 'swr';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BillingSettingsClient } from './BillingSettingsClient';

const navigationMock = vi.hoisted(() => ({
  pathname: '/org_1/settings/billing',
  replace: vi.fn(),
  searchParams: new URLSearchParams(),
}));

const permissionMock = vi.hoisted(() => ({
  canUpdateOrganization: true,
}));

vi.mock('@/hooks/use-permissions', () => ({
  usePermissions: () => ({
    hasPermission: (resource: string, action: string) =>
      resource === 'organization' &&
      action === 'update' &&
      permissionMock.canUpdateOrganization,
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

function renderBillingSettings({
  hasPaymentMethod = true,
  backgroundChecks = 4,
  penetrationTests = 2,
}: {
  hasPaymentMethod?: boolean;
  backgroundChecks?: number;
  penetrationTests?: number;
} = {}) {
  return render(
    <SWRConfig value={{ provider: () => new Map() }}>
      <BillingSettingsClient
        organizationId="org_1"
        initialBillingStatus={{
          hasPaymentMethod,
          setupAt: null,
          usage: { backgroundChecks, penetrationTests },
        }}
      />
    </SWRConfig>,
  );
}

describe('BillingSettingsClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiClient.get).mockReset();
    vi.mocked(apiClient.post).mockReset();
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { url: '#stripe-session' },
      status: 200,
    });
    permissionMock.canUpdateOrganization = true;
    navigationMock.searchParams = new URLSearchParams();
  });

  it('opens the Stripe billing portal when a payment method is saved', async () => {
    const user = userEvent.setup();
    renderBillingSettings({ hasPaymentMethod: true });

    expect(screen.getByText('Billing set up')).toBeInTheDocument();
    expect(screen.getByText('Historical usage')).toBeInTheDocument();
    expect(screen.getByText('Penetration Tests')).toBeInTheDocument();
    expect(screen.getByText('Background Checks')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText(/update billing details, cards, and receipts/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /open stripe portal/i }));

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith(
        '/v1/background-check-billing/portal',
        { returnUrl: 'http://localhost:3000/org_1/settings/billing' },
        'org_1',
      );
    });
  });

  it('opens a Stripe setup session when no payment method is saved', async () => {
    const user = userEvent.setup();
    renderBillingSettings({ hasPaymentMethod: false });

    expect(screen.getByText('Payment method needed')).toBeInTheDocument();
    expect(screen.getByText(/background checks and penetration testing/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /add payment method/i }));

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith(
        '/v1/background-check-billing/setup-session',
        {
          successUrl:
            'http://localhost:3000/org_1/settings/billing?background_check_billing=success&session_id={CHECKOUT_SESSION_ID}',
          cancelUrl: 'http://localhost:3000/org_1/settings/billing',
        },
        'org_1',
      );
    });
  });

  it('disables billing updates for read-only users', async () => {
    const user = userEvent.setup();
    permissionMock.canUpdateOrganization = false;
    renderBillingSettings({ hasPaymentMethod: true });

    const button = screen.getByRole('button', { name: /open stripe portal/i });
    expect(button).toBeDisabled();
    await user.click(button);

    expect(apiClient.post).not.toHaveBeenCalled();
    expect(
      screen.getByText('Ask an organization admin to update billing details.'),
    ).toBeInTheDocument();
  });

  it('falls back to zero usage for older billing status payloads', () => {
    render(
      <SWRConfig value={{ provider: () => new Map() }}>
        <BillingSettingsClient
          organizationId="org_1"
          initialBillingStatus={{ hasPaymentMethod: false, setupAt: null }}
        />
      </SWRConfig>,
    );

    expect(screen.getAllByText('0')).toHaveLength(2);
  });
});
