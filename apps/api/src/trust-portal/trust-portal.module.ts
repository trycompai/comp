import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TrustPortalController } from './trust-portal.controller';
import { TrustPortalService } from './trust-portal.service';

@Module({
  imports: [AuthModule],
  controllers: [TrustPortalController],
  providers: [TrustPortalService],
  exports: [TrustPortalService],
})
export class TrustPortalModule {}
