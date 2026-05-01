export interface BillingInvoice {
  id: string;
  number: string;
  createdAt: string;
  dueDate: string | null;
  amountPaid: number;
  amountDue: number;
  currency: string;
  status: string;
  type: 'Subscription' | 'One Time';
  hostedInvoiceUrl: string | null;
  invoicePdfUrl: string | null;
}

export interface BackgroundCheckBillingStatus {
  hasPaymentMethod: boolean;
  setupAt: string | null;
  usage?: {
    backgroundChecks: number;
    penetrationTests: number;
  };
  preferences?: BillingPreferences | null;
  trialEligibility?: {
    pentest: boolean;
    background_check: boolean;
  };
  usageRows?: BillingUsageRow[];
  subscriptions?: Array<{
    skuKey: string;
    status: string;
    includedQuantity: number;
    usedQuantity: number;
    currentPeriodStart: string | null;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
  }>;
  invoices?: BillingInvoice[];
}

export interface BillingPreferences {
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
  taxId: {
    id: string;
    type: string;
    value: string;
    verificationStatus: string | null;
  } | null;
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
