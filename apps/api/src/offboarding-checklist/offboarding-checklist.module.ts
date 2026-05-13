import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AttachmentsModule } from '../attachments/attachments.module';
import { OffboardingChecklistController } from './offboarding-checklist.controller';
import { OffboardingChecklistService } from './offboarding-checklist.service';

@Module({
  imports: [AuthModule, AttachmentsModule],
  controllers: [OffboardingChecklistController],
  providers: [OffboardingChecklistService],
  exports: [OffboardingChecklistService],
})
export class OffboardingChecklistModule {}
