export interface BackgroundCheckBillingStatus {
  hasPaymentMethod: boolean;
  setupAt: string | null;
  usage?: {
    backgroundChecks: number;
    penetrationTests: number;
  };
}
