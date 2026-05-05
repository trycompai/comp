import type { BillingProductKey } from '@trycompai/billing';
import type { BillingInvoice } from './billing-invoices';
import type { BillingPreferences } from './billing-preferences';

export interface BillingStatus {
  hasBilling: boolean;
  hasPaymentMethod: boolean;
  setupAt: Date | null;
  usage: {
    backgroundChecks: number;
    penetrationTests: number;
  };
  preferences: BillingPreferences;
  trialEligibility: {
    pentest: boolean;
    background_check: boolean;
  };
  usageRows: BillingUsageRow[];
  subscriptions: Array<{
    skuKey: string;
    status: string;
    includedQuantity: number;
    usedQuantity: number;
    currentPeriodStart: string | null;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
  }>;
  // Aggregated wallet balance per product. Mirrors what
  // `BillingEntitlementsService.tryConsumeIncludedUsageForProduct` falls
  // back to when a Stripe subscription is missing or exhausted, so the UI
  // can keep its allowance display in sync with the backend's actual
  // consumption decision.
  creditBalances: Array<{
    productKey: BillingProductKey;
    balance: number;
  }>;
  invoices: BillingInvoice[];
}

export interface BillingUsageRow {
  id: string;
  service: 'Penetration Test' | 'Background Check';
  skuKey: string;
  details: string;
  status: string;
  billingType: string;
  createdAt: string;
  updatedAt: string;
  subscriptionRemaining: number | null;
  subscriptionIncluded: number | null;
  subscriptionPeriodEnd: string | null;
}
