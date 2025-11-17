import { Module } from '@nestjs/common';
import { AttachmentsModule } from '../attachments/attachments.module';
import { AuthModule } from '../auth/auth.module';
import { TrustEmailService } from './email.service';
import { NdaPdfService } from './nda-pdf.service';
import { PolicyPdfRendererService } from './policy-pdf-renderer.service';
import { TrustAccessController } from './trust-access.controller';
import { TrustAccessService } from './trust-access.service';
import { TrustPortalController } from './trust-portal.controller';
import { TrustPortalService } from './trust-portal.service';

@Module({
  imports: [AuthModule, AttachmentsModule],
  controllers: [TrustPortalController, TrustAccessController],
  providers: [
    TrustPortalService,
    TrustAccessService,
    NdaPdfService,
    TrustEmailService,
    PolicyPdfRendererService,
  ],
  exports: [TrustPortalService, TrustAccessService],
})
export class TrustPortalModule {}
