import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { StripeModule } from '../stripe/stripe.module';
import { BillingController } from './billing.controller';
import { BillingCreditsService } from './billing-credits.service';
import { BillingEntitlementsService } from './billing-entitlements.service';
import { BillingService } from './billing.service';
import { BillingWebhookService } from './billing-webhook.service';

@Module({
  imports: [AuthModule, StripeModule],
  controllers: [BillingController],
  providers: [
    BillingService,
    BillingCreditsService,
    BillingEntitlementsService,
    BillingWebhookService,
  ],
  exports: [BillingService, BillingCreditsService, BillingEntitlementsService],
})
export class BillingModule {}
