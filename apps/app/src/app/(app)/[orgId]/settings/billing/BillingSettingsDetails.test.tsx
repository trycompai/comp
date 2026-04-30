import { apiClient } from '@/lib/api-client';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SWRConfig } from 'swr';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BillingSettingsClient } from './BillingSettingsClient';
import type { BackgroundCheckBillingStatus } from './types';

vi.mock('@/hooks/use-permissions', () => ({
  usePermissions: () => ({
    hasPermission: (resource: string, action: string) =>
      resource === 'organization' && action === 'update',
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
  usePathname: () => '/org_1/settings/billing',
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

function renderBillingSettings(status: Partial<BackgroundCheckBillingStatus> = {}) {
  return render(
    <SWRConfig value={{ provider: () => new Map() }}>
      <BillingSettingsClient
        organizationId="org_1"
        initialBillingStatus={{
          hasPaymentMethod: true,
          setupAt: null,
          usage: { backgroundChecks: 4, penetrationTests: 2 },
          preferences: {
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
          usageRows: [],
          subscriptions: [],
          invoices: [],
          ...status,
        }}
      />
    </SWRConfig>,
  );
}

describe('BillingSettingsClient details', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
  });

  it('filters invoices by search query', async () => {
    const user = userEvent.setup();
    renderBillingSettings({
      invoices: [
        {
          id: 'in_1',
          number: 'INV-001',
          createdAt: '2026-04-30T09:35:07.000Z',
          dueDate: null,
          amountPaid: 4900,
          amountDue: 4900,
          currency: 'usd',
          status: 'paid',
          type: 'One Time',
          hostedInvoiceUrl: 'https://invoice.stripe.com/i/in_1',
          invoicePdfUrl: 'https://invoice.stripe.com/i/in_1.pdf',
        },
        {
          id: 'in_2',
          number: 'INV-002',
          createdAt: '2026-04-01T09:35:07.000Z',
          dueDate: null,
          amountPaid: 0,
          amountDue: 0,
          currency: 'usd',
          status: 'paid',
          type: 'Subscription',
          hostedInvoiceUrl: null,
          invoicePdfUrl: null,
        },
      ],
    });

    await user.click(screen.getByRole('tab', { name: /billing details/i }));
    await user.type(screen.getByLabelText('Search invoices'), 'subscription');

    expect(screen.queryByText('INV-001')).not.toBeInTheDocument();
    expect(screen.getByText('INV-002')).toBeInTheDocument();
  });

  it('shows run history and monthly remaining usage on the Usage tab', async () => {
    const user = userEvent.setup();
    renderBillingSettings({
      subscriptions: [
        {
          skuKey: 'background_checks_monthly_25',
          status: 'active',
          includedQuantity: 25,
          usedQuantity: 3,
          currentPeriodStart: '2026-04-30T00:00:00.000Z',
          currentPeriodEnd: '2026-05-30T00:00:00.000Z',
          cancelAtPeriodEnd: false,
        },
      ],
      usageRows: [
        {
          id: 'bcr_1',
          service: 'Background Check',
          skuKey: 'background_checks_monthly_25',
          details: 'Ada Lovelace (ada@example.com)',
          status: 'Completed',
          billingType: 'Subscription allowance',
          createdAt: '2026-04-30T10:00:00.000Z',
          updatedAt: '2026-04-30T10:05:00.000Z',
          subscriptionRemaining: 22,
          subscriptionIncluded: 25,
          subscriptionPeriodEnd: '2026-05-30T00:00:00.000Z',
        },
      ],
    });

    await user.click(screen.getByRole('tab', { name: /^usage$/i }));

    expect(screen.getByText('Ada Lovelace (ada@example.com)')).toBeInTheDocument();
    expect(screen.getByText('Subscription allowance')).toBeInTheDocument();
    expect(screen.getByText('22 of 25')).toBeInTheDocument();
  });

  it('saves billing preferences', async () => {
    const user = userEvent.setup();
    renderBillingSettings();

    await user.click(screen.getByRole('tab', { name: /billing details/i }));
    await user.clear(screen.getByLabelText('Billing email'));
    await user.type(screen.getByLabelText('Billing email'), 'accounts@example.com');
    await user.type(screen.getByLabelText('PO / reference'), 'PO-123');
    await user.click(screen.getByRole('button', { name: /save billing preferences/i }));

    await waitFor(() => {
      expect(apiClient.put).toHaveBeenCalledWith(
        '/v1/billing/preferences',
        expect.objectContaining({
          companyName: 'Test Company',
          billingEmail: 'accounts@example.com',
          purchaseOrder: 'PO-123',
        }),
        'org_1',
      );
    });
  });
});
