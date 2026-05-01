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
  trialEligibility: { pentest: true, background_check: true },
  usageRows: [],
  subscriptions: [],
  invoices: [],
};

function renderAddOnPlans({
  addOnSlug,
  subscriptions = [],
  trialEligibility = emptyBillingStatus.trialEligibility,
}: {
  addOnSlug: 'penetration-tests' | 'background-checks';
  subscriptions?: NonNullable<BackgroundCheckBillingStatus['subscriptions']>;
  trialEligibility?: BackgroundCheckBillingStatus['trialEligibility'];
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
          trialEligibility,
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
    render(
      <BillingAddOnsOverview
        organizationId="org_1"
        subscriptions={[]}
        trialEligibility={emptyBillingStatus.trialEligibility}
      />,
    );

    expect(screen.getByText('Penetration Tests')).toBeInTheDocument();
    expect(screen.getByText('Background Checks')).toBeInTheDocument();
    expect(screen.getAllByText('14-day free trial')).toHaveLength(2);
    expect(screen.getAllByText(/no charge today/i)).toHaveLength(2);
    screen.getByRole('button', { name: /view penetration tests plans/i }).click();
    expect(navigationMock.push).toHaveBeenCalledWith(
      '/org_1/settings/billing/add-ons/penetration-tests',
    );
    screen.getByRole('button', { name: /view background checks plans/i }).click();
    expect(navigationMock.push).toHaveBeenCalledWith(
      '/org_1/settings/billing/add-ons/background-checks',
    );
  });

  it('hides overview trial copy for products with subscription history', () => {
    render(
      <BillingAddOnsOverview
        organizationId="org_1"
        subscriptions={[]}
        trialEligibility={{ pentest: false, background_check: true }}
      />,
    );

    expect(screen.getAllByText('14-day free trial')).toHaveLength(1);
    expect(
      screen.queryByText(/start with a 14-day free trial on the first tier/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Turn every release into an audit-ready security check.'),
    ).toBeInTheDocument();
  });

  it('opens subscription checkout for an add-on plan', async () => {
    const user = userEvent.setup();
    renderAddOnPlans({ addOnSlug: 'background-checks' });

    await user.click(screen.getByRole('button', { name: /start free trial/i }));

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith(
        '/v1/billing/subscription-session',
        {
          skuKey: 'background_checks_monthly_3',
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
    expect(screen.getByRole('heading', { name: 'Penetration Tests' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /^overview$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /start free trial/i })).toBeInTheDocument();
    expect(screen.getByText('14-day free trial')).toBeInTheDocument();
  });

  it('hides trial copy once a product has subscription history', () => {
    renderAddOnPlans({
      addOnSlug: 'penetration-tests',
      trialEligibility: { pentest: false, background_check: true },
    });

    expect(screen.queryByText('14-day free trial')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /start monthly scans/i })).toBeInTheDocument();
  });

  it('shows active add-on subscriptions as disabled plan actions', async () => {
    const user = userEvent.setup();
    renderAddOnPlans({
      addOnSlug: 'penetration-tests',
      subscriptions: [
        {
          skuKey: 'pentest_monthly_1',
          status: 'active',
          includedQuantity: 1,
          usedQuantity: 1,
          currentPeriodStart: '2026-04-30T00:00:00.000Z',
          currentPeriodEnd: '2026-05-30T00:00:00.000Z',
          cancelAtPeriodEnd: false,
        },
      ],
    });

    const activeButton = screen.getByRole('button', { name: /current plan/i });
    expect(activeButton).toBeDisabled();
    expect(screen.getByText(/0 of 1.*remaining this period/i)).toBeInTheDocument();

    await user.click(activeButton);
    expect(apiClient.post).not.toHaveBeenCalledWith(
      '/v1/billing/subscription-session',
      expect.objectContaining({ skuKey: 'pentest_monthly_1' }),
      'org_1',
    );
  });

  it('ignores inactive same-product subscriptions when selecting the current plan', () => {
    renderAddOnPlans({
      addOnSlug: 'penetration-tests',
      subscriptions: [
        {
          skuKey: 'pentest_monthly_1',
          status: 'canceled',
          includedQuantity: 1,
          usedQuantity: 1,
          currentPeriodStart: '2026-03-30T00:00:00.000Z',
          currentPeriodEnd: '2026-04-30T00:00:00.000Z',
          cancelAtPeriodEnd: false,
        },
        {
          skuKey: 'pentest_monthly_3',
          status: 'active',
          includedQuantity: 3,
          usedQuantity: 1,
          currentPeriodStart: '2026-04-30T00:00:00.000Z',
          currentPeriodEnd: '2026-05-30T00:00:00.000Z',
          cancelAtPeriodEnd: false,
        },
      ],
      trialEligibility: { pentest: false, background_check: true },
    });

    expect(screen.getByRole('button', { name: /current plan/i })).toBeDisabled();
    expect(screen.getByText(/2 of 3.*remaining this period/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /switch to monthly scans/i })).toBeInTheDocument();
  });
});
