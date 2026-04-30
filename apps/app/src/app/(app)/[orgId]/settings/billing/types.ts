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
  invoices?: BillingInvoice[];
}
