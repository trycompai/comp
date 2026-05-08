export type BackgroundCheckStatus =
  | 'invited'
  | 'in_progress'
  | 'in_review'
  | 'completed'
  | 'completed_with_flags'
  | 'failed'
  | 'cancelled';

export interface BackgroundCheckRecord {
  id: string;
  employeeEmail: string;
  employeeName: string;
  requesterNotes: string | null;
  candidateUrl: string | null;
  status: BackgroundCheckStatus;
  identityStatus: string | null;
  employmentStatus: string | null;
  referenceStatus: string | null;
  rightToWorkStatus: string | null;
  adjudicationStatus: string | null;
  lastSyncedAt: string | null;
  reportSnapshot: unknown | null;
  reportSyncedAt: string | null;
}

export interface CustomBackgroundCheckAttachment {
  id: string;
  name: string;
  type: string;
  createdAt: string;
}

export interface BackgroundCheckBillingStatus {
  hasPaymentMethod: boolean;
  setupAt: string | null;
  subscriptions?: Array<{
    skuKey: string;
    status: string;
    includedQuantity: number;
    usedQuantity: number;
    currentPeriodStart: string | null;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
  }>;
  // Wallet credits per product. Optional because older API responses
  // and existing test fixtures don't set it; treated as zero balance
  // when absent.
  creditBalances?: Array<{
    productKey: 'pentest' | 'background_check';
    balance: number;
  }>;
}

export function isCompletedBackgroundCheck(status: BackgroundCheckStatus): boolean {
  return status === 'completed' || status === 'completed_with_flags';
}
