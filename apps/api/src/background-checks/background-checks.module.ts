import { Module } from '@nestjs/common';
import { AttachmentsModule } from '../attachments/attachments.module';
import { AuthModule } from '../auth/auth.module';
import { BackgroundCheckBillingController } from './background-check-billing.controller';
import { BackgroundCheckBillingService } from './background-check-billing.service';
import { BackgroundCheckCustomService } from './background-check-custom.service';
import { BackgroundCheckIdentityClient } from './background-check-identity.client';
import { BackgroundCheckPaymentService } from './background-check-payment.service';
import {
  BackgroundChecksController,
  PeopleBackgroundChecksController,
} from './background-checks.controller';
import { BackgroundChecksService } from './background-checks.service';

@Module({
  imports: [AuthModule, AttachmentsModule],
  controllers: [
    BackgroundChecksController,
    PeopleBackgroundChecksController,
    BackgroundCheckBillingController,
  ],
  providers: [
    BackgroundChecksService,
    BackgroundCheckBillingService,
    BackgroundCheckCustomService,
    BackgroundCheckIdentityClient,
    BackgroundCheckPaymentService,
  ],
  exports: [BackgroundChecksService, BackgroundCheckBillingService],
})
export class BackgroundChecksModule {}
