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
      resource === 'organization' && action === 'update' && permissionMock.canUpdateOrganization,
  }),
}));

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
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
  invoices = [
    {
      id: 'in_1',
      number: 'INV-001',
      createdAt: '2026-04-30T09:35:07.000Z',
      dueDate: null,
      amountPaid: 4900,
      amountDue: 4900,
      currency: 'usd',
      status: 'paid',
      type: 'One Time' as const,
      hostedInvoiceUrl: 'https://invoice.stripe.com/i/in_1',
      invoicePdfUrl: 'https://invoice.stripe.com/i/in_1.pdf',
    },
  ],
  subscriptions = [],
  usageRows = [],
  preferences = {
    companyName: 'Test Company',
    billingEmail: 'billing@example.com',
    purchaseOrder: null,
    address: {
      line1: null,
      line2: null,
      city: null,
      state: null,
      postalCode: null,
      country: null,
    },
    taxId: null,
  },
}: {
  hasPaymentMethod?: boolean;
  backgroundChecks?: number;
  penetrationTests?: number;
  invoices?: NonNullable<
    Parameters<typeof BillingSettingsClient>[0]['initialBillingStatus']['invoices']
  >;
  subscriptions?: NonNullable<
    Parameters<typeof BillingSettingsClient>[0]['initialBillingStatus']['subscriptions']
  >;
  usageRows?: NonNullable<
    Parameters<typeof BillingSettingsClient>[0]['initialBillingStatus']['usageRows']
  >;
  preferences?: NonNullable<
    Parameters<typeof BillingSettingsClient>[0]['initialBillingStatus']['preferences']
  >;
} = {}) {
  return render(
    <SWRConfig value={{ provider: () => new Map() }}>
      <BillingSettingsClient
        organizationId="org_1"
        initialBillingStatus={{
          hasPaymentMethod,
          setupAt: null,
          usage: { backgroundChecks, penetrationTests },
          preferences,
          usageRows,
          subscriptions,
          invoices,
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
    vi.mocked(apiClient.put).mockReset();
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { url: '#stripe-session' },
      status: 200,
    });
    vi.mocked(apiClient.put).mockResolvedValue({
      data: {
        hasPaymentMethod: true,
        setupAt: null,
        usage: { backgroundChecks: 4, penetrationTests: 2 },
        usageRows: [],
        preferences: {
          companyName: 'Test Company',
          billingEmail: 'accounts@example.com',
          purchaseOrder: 'PO-123',
          address: {
            line1: '1 Test Street',
            line2: null,
            city: 'London',
            state: null,
            postalCode: 'SW1A 1AA',
            country: 'GB',
          },
          taxId: null,
        },
        subscriptions: [],
        invoices: [],
      },
      status: 200,
    });
    permissionMock.canUpdateOrganization = true;
    navigationMock.searchParams = new URLSearchParams();
  });

  it('opens the billing portal when a payment method is saved', async () => {
    const user = userEvent.setup();
    renderBillingSettings({ hasPaymentMethod: true });

    await user.click(screen.getByRole('tab', { name: /billing details/i }));
    expect(screen.getByText('Billing set up')).toBeInTheDocument();
    expect(screen.getByText(/update billing details, cards, and receipts/i)).toBeInTheDocument();
    expect(screen.getByText('Invoices')).toBeInTheDocument();
    expect(screen.getByText('INV-001')).toBeInTheDocument();
    expect(screen.getByText('$49.00')).toBeInTheDocument();
    expect(screen.getByText('One Time')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /open billing portal/i }));

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith(
        '/v1/billing/portal',
        { returnUrl: 'http://localhost:3000/org_1/settings/billing' },
        'org_1',
      );
    });
  });

  it('opens a Stripe setup session when no payment method is saved', async () => {
    const user = userEvent.setup();
    renderBillingSettings({ hasPaymentMethod: false });

    await user.click(screen.getByRole('tab', { name: /billing details/i }));
    expect(screen.getByText('Payment method needed')).toBeInTheDocument();
    expect(screen.getByText(/background checks and penetration testing/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /add payment method/i }));

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith(
        '/v1/billing/setup-session',
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

    await user.click(screen.getByRole('tab', { name: /billing details/i }));
    const button = screen.getByRole('button', { name: /open billing portal/i });
    expect(button).toBeDisabled();
    await user.click(button);

    expect(apiClient.post).not.toHaveBeenCalled();
    expect(
      screen.getByText('Ask an organization admin to update billing details.'),
    ).toBeInTheDocument();
  });

  it('falls back to zero usage for older billing status payloads', async () => {
    const user = userEvent.setup();
    render(
      <SWRConfig value={{ provider: () => new Map() }}>
        <BillingSettingsClient
          organizationId="org_1"
          initialBillingStatus={{ hasPaymentMethod: false, setupAt: null }}
        />
      </SWRConfig>,
    );

    await user.click(screen.getByRole('tab', { name: /^usage$/i }));
    expect(screen.getAllByText('0')).toHaveLength(2);
    await user.click(screen.getByRole('tab', { name: /billing details/i }));
    expect(screen.getByText('No invoices yet.')).toBeInTheDocument();
  });

  it('renders usage dates in UTC to keep server and client output stable', async () => {
    const user = userEvent.setup();
    renderBillingSettings({
      usageRows: [
        {
          id: 'bue_1',
          service: 'Background Check',
          skuKey: 'background_checks_monthly_3',
          details: 'Ada Lovelace',
          billingType: 'Subscription',
          status: 'Consumed',
          createdAt: '2026-04-30T23:30:00.000Z',
          updatedAt: '2026-04-30T23:30:00.000Z',
          subscriptionRemaining: 2,
          subscriptionIncluded: 3,
          subscriptionPeriodEnd: '2026-05-30T00:00:00.000Z',
        },
      ],
    });

    await user.click(screen.getByRole('tab', { name: /^usage$/i }));

    expect(screen.getByText('Apr 30, 2026')).toBeInTheDocument();
  });
});
