import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { IntegrationPlatformModule } from '../integration-platform/integration-platform.module';
import { PentestBillingController } from './pentest-billing.controller';
import { PentestBillingService } from './pentest-billing.service';
import { SecurityPenetrationTestsController } from './security-penetration-tests.controller';
import { SecurityPenetrationTestsService } from './security-penetration-tests.service';

@Module({
  imports: [AuthModule, IntegrationPlatformModule],
  controllers: [SecurityPenetrationTestsController, PentestBillingController],
  providers: [SecurityPenetrationTestsService, PentestBillingService],
})
export class SecurityPenetrationTestsModule {}
