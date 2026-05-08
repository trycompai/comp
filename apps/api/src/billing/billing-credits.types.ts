import { BadRequestException } from '@nestjs/common';
import {
  getBillingSkuProductKey,
  type BillingProductKey,
  type BillingSkuKey,
} from '@trycompai/billing';

export type BillingCreditEventType =
  | 'grant'
  | 'consume'
  | 'refund'
  | 'adjustment'
  | 'migration';

export function assertCreditEventType(value: string): BillingCreditEventType {
  if (
    value === 'grant' ||
    value === 'consume' ||
    value === 'refund' ||
    value === 'adjustment' ||
    value === 'migration'
  ) {
    return value;
  }
  throw new BadRequestException('Unsupported billing credit event type.');
}

export interface BillingCreditBalanceSummary {
  id: string;
  productKey: BillingProductKey;
  skuKey: string | null;
  balance: number;
  totalGranted: number;
  totalConsumed: number;
  totalRefunded: number;
  lastSource: string;
  updatedAt: string;
}

export interface BillingCreditEventSummary {
  id: string;
  productKey: BillingProductKey;
  skuKey: string | null;
  eventType: BillingCreditEventType;
  quantity: number;
  source: string;
  note: string | null;
  adminUserId: string | null;
  sourceResourceId: string | null;
  createdAt: string;
}

export function validateCreditInput(params: {
  productKey: BillingProductKey;
  skuKey?: BillingSkuKey | null;
  quantity: number;
  note: string;
}) {
  if (!Number.isInteger(params.quantity) || params.quantity < 1) {
    throw new BadRequestException('Credit amount must be a positive integer.');
  }
  if (!params.note.trim()) {
    throw new BadRequestException('A note is required for credit grants.');
  }
  if (params.skuKey) {
    const productKey = getBillingSkuProductKey(params.skuKey);
    if (productKey !== params.productKey) {
      throw new BadRequestException('SKU does not belong to product.');
    }
  }
}

export function assertProductKey(value: string): BillingProductKey {
  if (value === 'pentest' || value === 'background_check') return value;
  throw new BadRequestException('Unsupported billing product.');
}
