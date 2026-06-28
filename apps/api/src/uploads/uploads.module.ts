import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';

/**
 * Provides the general presigned-upload mechanism. UploadsService is exported
 * so feature modules (questionnaire, evidence, ...) can read previously
 * uploaded files back from S3 by key. See UploadsService for the full pattern.
 *
 * AuthModule is imported so the controller's HybridAuthGuard can resolve its
 * dependencies (ApiKeyService, etc.).
 */
@Module({
  imports: [AuthModule],
  controllers: [UploadsController],
  providers: [UploadsService],
  exports: [UploadsService],
})
export class UploadsModule {}
