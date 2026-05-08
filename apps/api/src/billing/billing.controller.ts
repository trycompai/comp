import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Post,
  Put,
  Req,
  UseGuards,
  type RawBodyRequest,
} from '@nestjs/common';
import { ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthContext, OrganizationId } from '../auth/auth-context.decorator';
import { HybridAuthGuard } from '../auth/hybrid-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { Public } from '../auth/public.decorator';
import { RequirePermission } from '../auth/require-permission.decorator';
import type { AuthContext as AuthContextType } from '../auth/types';
import { BillingService } from './billing.service';
import { BillingWebhookService } from './billing-webhook.service';
import {
  BillingPortalDto,
  BillingPreferencesDto,
  BillingSetupSessionDto,
  BillingSetupSuccessDto,
  BillingSubscriptionCheckoutDto,
} from './dto/billing.dto';

@ApiTags('Billing')
@Controller({ path: 'billing', version: '1' })
@UseGuards(HybridAuthGuard, PermissionGuard)
@ApiSecurity('apikey')
export class BillingController {
  constructor(
    private readonly billingService: BillingService,
    private readonly webhookService: BillingWebhookService,
  ) {}

  @Get('status')
  @RequirePermission('organization', 'read')
  @ApiOperation({ summary: 'Get organization billing status' })
  async getStatus(@OrganizationId() organizationId: string) {
    return this.billingService.getStatus(organizationId);
  }

  @Put('preferences')
  @RequirePermission('organization', 'update')
  @ApiOperation({ summary: 'Update organization billing preferences' })
  async updatePreferences(
    @OrganizationId() organizationId: string,
    @Body() body: BillingPreferencesDto,
  ) {
    return this.billingService.updatePreferences({
      organizationId,
      preferences: {
        companyName: body.companyName,
        billingEmail: body.billingEmail,
        purchaseOrder: body.purchaseOrder ?? null,
        address: {
          line1: body.addressLine1 ?? null,
          line2: body.addressLine2 ?? null,
          city: body.addressCity ?? null,
          state: body.addressState ?? null,
          postalCode: body.addressPostalCode ?? null,
          country: body.addressCountry ?? null,
        },
        taxId: {
          type: body.taxIdType ?? null,
          value: body.taxIdValue ?? null,
        },
      },
    });
  }

  @Post('setup-session')
  @RequirePermission('organization', 'update')
  @HttpCode(200)
  @ApiOperation({ summary: 'Create a Stripe setup session' })
  async setupSession(
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
    @Body() body: BillingSetupSessionDto,
  ) {
    return this.billingService.createSetupSession({
      organizationId,
      successUrl: body.successUrl,
      cancelUrl: body.cancelUrl,
      customerEmail: authContext.userEmail,
    });
  }

  @Post('setup-success')
  @RequirePermission('organization', 'update')
  @HttpCode(200)
  @ApiOperation({ summary: 'Persist a successful Stripe setup session' })
  async setupSuccess(
    @OrganizationId() organizationId: string,
    @Body() body: BillingSetupSuccessDto,
  ) {
    return this.billingService.handleSetupSuccess({
      organizationId,
      sessionId: body.sessionId,
    });
  }

  @Post('portal')
  @RequirePermission('organization', 'update')
  @HttpCode(200)
  @ApiOperation({ summary: 'Create a Stripe billing portal session' })
  async portal(
    @OrganizationId() organizationId: string,
    @Body() body: BillingPortalDto,
  ) {
    return this.billingService.createBillingPortalSession({
      organizationId,
      returnUrl: body.returnUrl,
    });
  }

  @Post('subscription-session')
  @RequirePermission('organization', 'update')
  @HttpCode(200)
  @ApiOperation({ summary: 'Create a Stripe subscription Checkout session' })
  async subscriptionSession(
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
    @Body() body: BillingSubscriptionCheckoutDto,
  ) {
    return this.billingService.createSubscriptionCheckoutSession({
      organizationId,
      skuKey: body.skuKey,
      successUrl: body.successUrl,
      cancelUrl: body.cancelUrl,
      customerEmail: authContext.userEmail,
    });
  }

  @Post('webhook')
  @Public()
  @HttpCode(200)
  @ApiOperation({ summary: 'Receive Stripe billing webhook events' })
  async webhook(
    @Headers('stripe-signature') signature: string | undefined,
    @Req() req: RawBodyRequest<Request>,
  ) {
    return this.webhookService.handleWebhook({
      rawBody: req.rawBody,
      signature,
    });
  }
}
