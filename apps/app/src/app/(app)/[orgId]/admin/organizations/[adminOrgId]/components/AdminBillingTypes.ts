export interface AdminBillingPlan {
  skuKey: string;
  productKey: 'pentest' | 'background_check';
  name: string;
  unitAmount: number;
  currency: string;
  includedQuantity: number;
}

export interface AdminBillingSubscription {
  id: string;
  skuKey: string;
  productKey: 'pentest' | 'background_check' | null;
  stripeStatus: string;
  includedQuantity: number;
  usedQuantity: number;
  remainingQuantity: number;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

export interface AdminBillingCreditBalance {
  id: string;
  productKey: 'pentest' | 'background_check';
  skuKey: string | null;
  balance: number;
  totalGranted: number;
  totalConsumed: number;
  totalRefunded: number;
  lastSource: string;
  updatedAt: string;
}

export interface AdminBillingInvoice {
  id: string;
  number: string;
  createdAt: string;
  amountDue: number;
  amountPaid: number;
  currency: string;
  status: string;
  type: string;
  hostedInvoiceUrl: string | null;
  invoicePdfUrl: string | null;
}

export interface AdminBillingStatus {
  stripeCustomerId: string | null;
  hasPaymentMethod: boolean;
  preferences: {
    companyName: string | null;
    billingEmail: string | null;
    purchaseOrder: string | null;
    address: {
      line1: string | null;
      line2: string | null;
      city: string | null;
      state: string | null;
      postalCode: string | null;
      country: string | null;
    };
    taxId: { type: string; value: string } | null;
  };
  availablePlans: AdminBillingPlan[];
  subscriptions: AdminBillingSubscription[];
  creditBalances: AdminBillingCreditBalance[];
  invoices: AdminBillingInvoice[];
  failedInvoices: AdminBillingInvoice[];
  auditEvents: Array<{
    id: string;
    eventType: string;
    skuKey: string | null;
    createdAt: string;
  }>;
}
