export const ACTIVE_STATUSES: Array<'pending' | 'processing' | 'created' | 'assessing'> = [
  'pending',
  'processing',
  'created',
  'assessing',
];

import { VendorCategory, VendorStatus } from '@db';

const titleCase = (value: string) => {
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

const CATEGORY_LABEL_OVERRIDES: Partial<Record<VendorCategory, string>> = {
  [VendorCategory.software_as_a_service]: 'SaaS',
  [VendorCategory.hr]: 'HR',
};

const STATUS_LABEL_OVERRIDES: Partial<Record<VendorStatus, string>> = {};

export const CATEGORY_MAP: Record<VendorCategory, string> = Object.values(VendorCategory).reduce(
  (acc, category) => {
    acc[category] = CATEGORY_LABEL_OVERRIDES[category] ?? titleCase(category);
    return acc;
  },
  {} as Record<VendorCategory, string>,
);

export const VENDOR_STATUS_LABELS: Record<VendorStatus, string> = Object.values(
  VendorStatus,
).reduce(
  (acc, status) => {
    acc[status] = STATUS_LABEL_OVERRIDES[status] ?? titleCase(status);
    return acc;
  },
  {} as Record<VendorStatus, string>,
);
