import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UploadsModule } from '../uploads/uploads.module';
import { AttachmentsController } from './attachments.controller';
import { AttachmentsService } from './attachments.service';

@Module({
  // AuthModule: HybridAuthGuard deps. UploadsModule: presigned-upload s3Key reads.
  imports: [AuthModule, UploadsModule],
  controllers: [AttachmentsController],
  providers: [AttachmentsService],
  exports: [AttachmentsService],
})
export class AttachmentsModule {}
