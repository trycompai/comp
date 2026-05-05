import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiExcludeController, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import {
  subscriptionBillingSkuKeys,
  type BillingSkuKey,
} from '@trycompai/billing';
import { PlatformAdminGuard } from '../auth/platform-admin.guard';
import { AdminAuditLogInterceptor } from './admin-audit-log.interceptor';
import { AdminBillingActionsService } from './admin-billing-actions.service';
import { AdminBillingService } from './admin-billing.service';
import {
  AdminBillingCancelSubscriptionDto,
  AdminBillingGrantCreditsDto,
  AdminBillingInvoiceActionDto,
  AdminBillingNoteDto,
  AdminBillingPaymentLinkDto,
  AdminBillingPreferencesDto,
  AdminBillingSubscriptionPreviewDto,
  AdminBillingSubscriptionDto,
} from './dto/admin-billing.dto';

interface AdminRequest {
  userId: string;
}

@ApiExcludeController()
@ApiTags('Admin - Billing')
@Controller({ path: 'admin/organizations/:orgId/billing', version: '1' })
@UseGuards(PlatformAdminGuard)
@UseInterceptors(AdminAuditLogInterceptor)
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
@Throttle({ default: { ttl: 60_000, limit: 30 } })
export class AdminBillingController {
  constructor(
    private readonly billing: AdminBillingService,
    private readonly actions: AdminBillingActionsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get admin billing status for an organization' })
  async getStatus(@Param('orgId') orgId: string) {
    return this.billing.getStatus(orgId);
  }

  @Put('preferences')
  @ApiOperation({ summary: 'Update billing preferences for an organization' })
  async updatePreferences(
    @Param('orgId') orgId: string,
    @Req() req: AdminRequest,
    @Body() body: AdminBillingPreferencesDto,
  ) {
    return this.billing.updatePreferences({
      organizationId: orgId,
      adminUserId: req.userId,
      note: body.note,
      confirmBillingEmailChange: body.confirmBillingEmailChange,
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

  @Post('subscriptions/preview')
  @ApiOperation({ summary: 'Preview a subscription plan change' })
  async previewSubscription(
    @Param('orgId') orgId: string,
    @Body() body: AdminBillingSubscriptionPreviewDto,
  ) {
    return this.billing.previewSubscription({
      organizationId: orgId,
      skuKey: assertSubscriptionSku(body.skuKey),
    });
  }

  @Post('subscriptions')
  @ApiOperation({ summary: 'Create or change a subscription plan' })
  async setSubscription(
    @Param('orgId') orgId: string,
    @Req() req: AdminRequest,
    @Body() body: AdminBillingSubscriptionDto,
  ) {
    return this.billing.setSubscription({
      organizationId: orgId,
      adminUserId: req.userId,
      skuKey: assertSubscriptionSku(body.skuKey),
      returnUrl: body.returnUrl,
      note: body.note,
      confirmDowngrade: body.confirmDowngrade,
    });
  }

  @Post('subscriptions/:subscriptionId/cancel')
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  async cancelSubscription(
    @Param('orgId') orgId: string,
    @Param('subscriptionId') subscriptionId: string,
    @Req() req: AdminRequest,
    @Body() body: AdminBillingCancelSubscriptionDto,
  ) {
    return this.actions.cancelSubscription({
      organizationId: orgId,
      adminUserId: req.userId,
      subscriptionId,
      mode: body.mode,
      note: body.note,
      confirm: body.confirm,
    });
  }

  @Post('subscriptions/:subscriptionId/resume')
  async resumeSubscription(
    @Param('orgId') orgId: string,
    @Param('subscriptionId') subscriptionId: string,
    @Req() req: AdminRequest,
    @Body() body: AdminBillingNoteDto,
  ) {
    return this.actions.resumeSubscription({
      organizationId: orgId,
      adminUserId: req.userId,
      subscriptionId,
      note: body.note,
    });
  }

  @Post('payment-link')
  async createPaymentLink(
    @Param('orgId') orgId: string,
    @Body() body: AdminBillingPaymentLinkDto,
  ) {
    return this.actions.createPaymentLink({
      organizationId: orgId,
      successUrl: body.successUrl,
      cancelUrl: body.cancelUrl,
    });
  }

  @Post('credits')
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  async grantCredits(
    @Param('orgId') orgId: string,
    @Req() req: AdminRequest,
    @Body() body: AdminBillingGrantCreditsDto,
  ) {
    return this.actions.grantCredits({
      organizationId: orgId,
      adminUserId: req.userId,
      productKey: body.productKey,
      quantity: body.quantity,
      note: body.note,
      confirm: body.confirm,
    });
  }

  @Post('invoices/:invoiceId/retry-link')
  async getInvoiceRetryLink(
    @Param('orgId') orgId: string,
    @Param('invoiceId') invoiceId: string,
    @Req() req: AdminRequest,
    @Body() body: AdminBillingInvoiceActionDto,
  ) {
    return this.actions.getInvoiceRetryLink({
      organizationId: orgId,
      adminUserId: req.userId,
      invoiceId,
      note: body.note,
    });
  }
}

function assertSubscriptionSku(value: string): BillingSkuKey {
  if (subscriptionBillingSkuKeys.some((skuKey) => skuKey === value)) {
    return value as BillingSkuKey;
  }
  throw new Error('Invalid subscription SKU.');
}
