import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { NovuService } from '../notifications/novu.service';
import { FindingAuditService } from './finding-audit.service';
import { FindingNotifierService } from './finding-notifier.service';
import { FindingsController } from './findings.controller';
import { FindingsService } from './findings.service';

@Module({
  imports: [AuthModule],
  controllers: [FindingsController],
  providers: [
    FindingsService,
    FindingAuditService,
    FindingNotifierService,
    NovuService,
  ],
  exports: [FindingsService, FindingAuditService],
})
export class FindingsModule {}
