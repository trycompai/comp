import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { BillingModule } from '../billing/billing.module';
import { PentestCreditsController } from './pentest-credits.controller';
import { PentestCreditsService } from './pentest-credits.service';
import { SecurityPenetrationTestsController } from './security-penetration-tests.controller';
import { SecurityPenetrationTestsService } from './security-penetration-tests.service';

@Module({
  imports: [AuthModule, BillingModule],
  controllers: [SecurityPenetrationTestsController, PentestCreditsController],
  providers: [SecurityPenetrationTestsService, PentestCreditsService],
  exports: [PentestCreditsService],
})
export class SecurityPenetrationTestsModule {}
