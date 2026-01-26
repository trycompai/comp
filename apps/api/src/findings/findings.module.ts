import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { FindingAuditService } from './finding-audit.service';
import { FindingsController } from './findings.controller';
import { FindingsService } from './findings.service';

@Module({
  imports: [AuthModule],
  controllers: [FindingsController],
  providers: [FindingsService, FindingAuditService],
  exports: [FindingsService, FindingAuditService],
})
export class FindingsModule {}
