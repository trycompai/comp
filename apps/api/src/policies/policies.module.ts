import { Module } from '@nestjs/common';
import { AttachmentsModule } from '../attachments/attachments.module';
import { AuthModule } from '../auth/auth.module';
import { PolicyPdfRendererService } from '../trust-portal/policy-pdf-renderer.service';
import { PoliciesController } from './policies.controller';
import { PoliciesService } from './policies.service';

@Module({
  imports: [AuthModule, AttachmentsModule],
  controllers: [PoliciesController],
  providers: [PoliciesService, PolicyPdfRendererService],
  exports: [PoliciesService],
})
export class PoliciesModule {}
