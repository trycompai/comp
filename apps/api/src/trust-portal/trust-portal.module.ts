import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TrustAccessController } from './trust-access.controller';
import { TrustAccessService } from './trust-access.service';
import { TrustPortalController } from './trust-portal.controller';
import { TrustPortalService } from './trust-portal.service';

@Module({
  imports: [AuthModule],
  controllers: [TrustPortalController, TrustAccessController],
  providers: [TrustPortalService, TrustAccessService],
  exports: [TrustPortalService, TrustAccessService],
})
export class TrustPortalModule {}
