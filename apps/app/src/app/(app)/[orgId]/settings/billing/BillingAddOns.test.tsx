import { apiClient } from '@/lib/api-client';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SWRConfig } from 'swr';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BillingAddOnPlansClient } from './BillingAddOnPlansClient';
import { BillingAddOnsOverview } from './BillingAddOnsOverview';
import { getBillingAddOn } from './billingAddOns';
import type { BackgroundCheckBillingStatus } from './types';

const navigationMock = vi.hoisted(() => ({
  push: vi.fn(),
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
  },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: navigationMock.push }),
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn() },
}));

const emptyBillingStatus: BackgroundCheckBillingStatus = {
  hasPaymentMethod: true,
  setupAt: null,
  usage: { backgroundChecks: 0, penetrationTests: 0 },
  preferences: null,
  usageRows: [],
  subscriptions: [],
  invoices: [],
};

function renderAddOnPlans({
  addOnSlug,
  subscriptions = [],
}: {
  addOnSlug: 'penetration-tests' | 'background-checks';
  subscriptions?: NonNullable<BackgroundCheckBillingStatus['subscriptions']>;
}) {
  const addOn = getBillingAddOn(addOnSlug);
  if (!addOn) throw new Error(`Missing test add-on: ${addOnSlug}`);

  return render(
    <SWRConfig value={{ provider: () => new Map() }}>
      <BillingAddOnPlansClient
        organizationId="org_1"
        addOn={addOn}
        initialBillingStatus={{
          ...emptyBillingStatus,
          subscriptions,
        }}
      />
    </SWRConfig>,
  );
}

describe('billing add-ons', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    navigationMock.push.mockReset();
    permissionMock.canUpdateOrganization = true;
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { url: '#stripe-session' },
      status: 200,
    });
  });

  it('shows product-level add-ons before plan selection', () => {
    render(<BillingAddOnsOverview organizationId="org_1" subscriptions={[]} />);

    expect(screen.getByText('Penetration Tests')).toBeInTheDocument();
    expect(screen.getByText('Background Checks')).toBeInTheDocument();
    screen.getByRole('button', { name: /view penetration tests plans/i }).click();
    expect(navigationMock.push).toHaveBeenCalledWith(
      '/org_1/settings/billing/add-ons/penetration-tests',
    );
    screen.getByRole('button', { name: /view background checks plans/i }).click();
    expect(navigationMock.push).toHaveBeenCalledWith(
      '/org_1/settings/billing/add-ons/background-checks',
    );
  });

  it('opens subscription checkout for an add-on plan', async () => {
    const user = userEvent.setup();
    renderAddOnPlans({ addOnSlug: 'background-checks' });

    await user.click(screen.getByRole('button', { name: /subscribe to background checks/i }));

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith(
        '/v1/billing/subscription-session',
        {
          skuKey: 'background_checks_monthly_25',
          successUrl:
            'http://localhost:3000/org_1/settings/billing/add-ons/background-checks?billing_subscription=success&session_id={CHECKOUT_SESSION_ID}',
          cancelUrl: 'http://localhost:3000/org_1/settings/billing/add-ons/background-checks',
        },
        'org_1',
      );
    });
  });

  it('shows add-on plans on a standalone overview tab', () => {
    renderAddOnPlans({ addOnSlug: 'penetration-tests' });

    expect(screen.getByRole('link', { name: /add-ons/i })).toHaveAttribute(
      'href',
      '/org_1/settings/billing',
    );
    expect(screen.getByRole('heading', { name: 'Penetration Test' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /^overview$/i })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /subscribe to penetration tests/i }),
    ).toBeInTheDocument();
  });

  it('shows active add-on subscriptions as disabled plan actions', async () => {
    const user = userEvent.setup();
    renderAddOnPlans({
      addOnSlug: 'penetration-tests',
      subscriptions: [
        {
          skuKey: 'pentest_monthly_5',
          status: 'active',
          includedQuantity: 5,
          usedQuantity: 1,
          currentPeriodStart: '2026-04-30T00:00:00.000Z',
          currentPeriodEnd: '2026-05-30T00:00:00.000Z',
          cancelAtPeriodEnd: false,
        },
      ],
    });

    const activeButton = screen.getByRole('button', { name: /active subscription/i });
    expect(activeButton).toBeDisabled();
    expect(screen.getByText('1 of 5 used this period.')).toBeInTheDocument();

    await user.click(activeButton);
    expect(apiClient.post).not.toHaveBeenCalledWith(
      '/v1/billing/subscription-session',
      expect.objectContaining({ skuKey: 'pentest_monthly_5' }),
      'org_1',
    );
  });
});
