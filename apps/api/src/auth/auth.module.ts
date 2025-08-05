import { Module } from '@nestjs/common';
import { ApiKeyGuard } from './api-key.guard';
import { ApiKeyService } from './api-key.service';
import { HybridAuthGuard } from './hybrid-auth.guard';

@Module({
  providers: [ApiKeyService, ApiKeyGuard, HybridAuthGuard],
  exports: [ApiKeyService, ApiKeyGuard, HybridAuthGuard],
})
export class AuthModule {}
