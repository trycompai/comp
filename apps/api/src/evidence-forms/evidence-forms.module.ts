import { Module } from '@nestjs/common';
import { AttachmentsModule } from '@/attachments/attachments.module';
import { AuthModule } from '@/auth/auth.module';
import { TimelinesModule } from '../timelines/timelines.module';
import { EvidenceFormsController } from './evidence-forms.controller';
import { EvidenceFormsNotifierService } from './evidence-forms-notifier.service';
import { EvidenceFormsService } from './evidence-forms.service';

@Module({
  imports: [AuthModule, AttachmentsModule, TimelinesModule],
  controllers: [EvidenceFormsController],
  providers: [EvidenceFormsService, EvidenceFormsNotifierService],
  exports: [EvidenceFormsService],
})
export class EvidenceFormsModule {}
