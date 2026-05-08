import { Injectable } from '@nestjs/common';
import {
  getBillingSku,
  resolveBillingCatalogEnvironment,
} from '@trycompai/billing';
import { BillingService } from '../billing/billing.service';
import { validateBackgroundCheckBillingRedirectUrl } from './background-check-billing-urls';

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
    validateBackgroundCheckBillingRedirectUrl(params.successUrl);
    validateBackgroundCheckBillingRedirectUrl(params.cancelUrl);
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
    validateBackgroundCheckBillingRedirectUrl(params.returnUrl);
    return this.billingService.createBillingPortalSession(params);
  }

  async getBackgroundCheckPrice(): Promise<{
    id: string;
    unitAmount: number;
    currency: string;
  }> {
    const sku = getBillingSku({
      environment: resolveBillingCatalogEnvironment({
        stripeSecretKey: process.env.STRIPE_SECRET_KEY,
        nodeEnv: process.env.NODE_ENV,
      }),
      skuKey: 'background_check_one_time',
    });
    return {
      id: sku.stripePriceId,
      unitAmount: sku.unitAmount,
      currency: sku.currency,
    };
  }
}
