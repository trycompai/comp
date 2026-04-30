import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { BillingController } from './billing.controller';
import { BillingEntitlementsService } from './billing-entitlements.service';
import { BillingService } from './billing.service';
import { BillingWebhookService } from './billing-webhook.service';

@Module({
  imports: [AuthModule],
  controllers: [BillingController],
  providers: [
    BillingService,
    BillingEntitlementsService,
    BillingWebhookService,
  ],
  exports: [BillingService, BillingEntitlementsService],
})
export class BillingModule {}
