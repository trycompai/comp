import type { BillingProductKey } from '@trycompai/billing';
import type {
  BillingCreditBalanceSummary,
  BillingCreditEventSummary,
} from '../billing/billing-credits.types';
import type { BillingInvoice } from '../billing/billing-invoices';
import type { BillingPreferences } from '../billing/billing-preferences';
import type { BillingUsageRow } from '../billing/billing.types';

export interface AdminBillingPlan {
  skuKey: string;
  productKey: BillingProductKey;
  name: string;
  unitAmount: number;
  currency: string;
  includedQuantity: number;
}

export interface AdminBillingSubscription {
  id: string;
  skuKey: string;
  productKey: BillingProductKey | null;
  stripeSubscriptionId: string;
  stripeSubscriptionItemId: string;
  stripeStatus: string;
  includedQuantity: number;
  usedQuantity: number;
  remainingQuantity: number;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  canceledAt: string | null;
}

export interface AdminBillingAuditEvent {
  id: string;
  eventType: string;
  skuKey: string | null;
  stripeEventId: string | null;
  metadata: unknown;
  createdAt: string;
}

export interface AdminBillingStatus {
  organization: {
    id: string;
    name: string;
  };
  stripeCustomerId: string | null;
  hasPaymentMethod: boolean;
  paymentMethodUpdatedAt: string | null;
  preferences: BillingPreferences;
  availablePlans: AdminBillingPlan[];
  subscriptions: AdminBillingSubscription[];
  creditBalances: BillingCreditBalanceSummary[];
  creditEvents: BillingCreditEventSummary[];
  usageRows: BillingUsageRow[];
  invoices: BillingInvoice[];
  failedInvoices: BillingInvoice[];
  auditEvents: AdminBillingAuditEvent[];
}

export interface AdminBillingPreview {
  amountDue: number;
  currency: string;
  subscriptionId: string | null;
  prorationDate: number;
}
