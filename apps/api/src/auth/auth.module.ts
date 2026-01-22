import { Module } from '@nestjs/common';
import { ApiKeyGuard } from './api-key.guard';
import { ApiKeyService } from './api-key.service';
import { HybridAuthGuard } from './hybrid-auth.guard';
import { InternalTokenGuard } from './internal-token.guard';

@Module({
  providers: [ApiKeyService, ApiKeyGuard, HybridAuthGuard, InternalTokenGuard],
  exports: [ApiKeyService, ApiKeyGuard, HybridAuthGuard, InternalTokenGuard],
})
export class AuthModule {}
