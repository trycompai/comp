import { api } from '@/lib/api-client';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SWRConfig } from 'swr';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminBillingTab } from './AdminBillingTab';
import type { AdminBillingStatus } from './AdminBillingTypes';

vi.mock('@/lib/api-client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  },
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const status: AdminBillingStatus = {
  stripeCustomerId: 'cus_123',
  hasPaymentMethod: true,
  preferences: {
    companyName: 'Test Co',
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
  availablePlans: [
    {
      skuKey: 'pentest_monthly_1',
      productKey: 'pentest',
      name: 'Pentest Monthly 1',
      unitAmount: 9900,
      currency: 'usd',
      includedQuantity: 1,
    },
  ],
  subscriptions: [
    {
      id: 'obs_1',
      skuKey: 'pentest_monthly_1',
      productKey: 'pentest',
      stripeStatus: 'active',
      includedQuantity: 1,
      usedQuantity: 0,
      remainingQuantity: 1,
      currentPeriodEnd: '2026-06-01T00:00:00.000Z',
      cancelAtPeriodEnd: false,
    },
  ],
  creditBalances: [
    {
      id: 'bcb_1',
      productKey: 'pentest',
      skuKey: null,
      balance: 2,
      totalGranted: 2,
      totalConsumed: 0,
      totalRefunded: 0,
      lastSource: 'manual',
      updatedAt: '2026-05-01T00:00:00.000Z',
    },
  ],
  invoices: [],
  failedInvoices: [],
  auditEvents: [],
};

function renderBillingTab() {
  return render(
    <SWRConfig value={{ provider: () => new Map() }}>
      <AdminBillingTab orgId="org_customer" currentOrgId="org_admin" />
    </SWRConfig>,
  );
}

describe('AdminBillingTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.get).mockResolvedValue({ data: status, status: 200 });
    vi.mocked(api.post).mockResolvedValue({ data: status, status: 200 });
    vi.mocked(api.put).mockResolvedValue({ data: status, status: 200 });
  });

  it('renders subscription and free-credit state for the selected org', async () => {
    renderBillingTab();

    expect(await screen.findByText('cus_123')).toBeInTheDocument();
    expect(screen.getByText('pentest_monthly_1')).toBeInTheDocument();
    expect(screen.getByText('Penetration tests')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('grants credits through the org-scoped admin endpoint', async () => {
    const user = userEvent.setup();
    renderBillingTab();

    await screen.findByText('Free credits');
    await user.type(screen.getByPlaceholderText('Reason for grant'), 'Support credit');
    await user.click(screen.getByRole('button', { name: /grant credits/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/v1/admin/organizations/org_customer/billing/credits',
        expect.objectContaining({
          productKey: 'pentest',
          quantity: 1,
          note: 'Support credit',
        }),
        'org_admin',
      );
    });
  });
});
