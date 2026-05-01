import type { BackgroundCheckBillingStatus } from './types';

export const emptyBillingStatus: BackgroundCheckBillingStatus = {
  hasPaymentMethod: false,
  setupAt: null,
  usage: {
    backgroundChecks: 0,
    penetrationTests: 0,
  },
  invoices: [],
  subscriptions: [],
  trialEligibility: {
    pentest: false,
    background_check: false,
  },
  usageRows: [],
  preferences: null,
};
