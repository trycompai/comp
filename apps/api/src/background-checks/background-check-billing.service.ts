import { Injectable } from '@nestjs/common';
import { BillingService } from '../billing/billing.service';

@Injectable()
export class BackgroundCheckBillingService {
  constructor(private readonly billingService: BillingService) {}

  async getStatus(organizationId: string) {
    return this.billingService.getStatus(organizationId);
  }

  async createSetupSession(params: {
    organizationId: string;
    successUrl: string;
    cancelUrl: string;
    customerEmail?: string;
  }): Promise<{ url: string }> {
    return this.billingService.createSetupSession(params);
  }

  async handleSetupSuccess(params: {
    organizationId: string;
    sessionId: string;
  }): Promise<{ success: true }> {
    return this.billingService.handleSetupSuccess(params);
  }

  async createBillingPortalSession(params: {
    organizationId: string;
    returnUrl: string;
  }): Promise<{ url: string }> {
    return this.billingService.createBillingPortalSession(params);
  }

  async getBackgroundCheckPrice(): Promise<{
    id: string;
    unitAmount: number;
    currency: string;
  }> {
    const sku = this.billingService.getOneTimeBackgroundCheckSku();
    return {
      id: sku.stripePriceId,
      unitAmount: sku.unitAmount,
      currency: sku.currency,
    };
  }
}
