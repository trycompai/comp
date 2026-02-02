import { Module } from '@nestjs/common';
import { ApiKeyGuard } from './api-key.guard';
import { ApiKeyService } from './api-key.service';
import { HybridAuthGuard } from './hybrid-auth.guard';
import { InternalTokenGuard } from './internal-token.guard';
import { PermissionGuard } from './permission.guard';

@Module({
  providers: [
    ApiKeyService,
    ApiKeyGuard,
    HybridAuthGuard,
    InternalTokenGuard,
    PermissionGuard,
  ],
  exports: [
    ApiKeyService,
    ApiKeyGuard,
    HybridAuthGuard,
    InternalTokenGuard,
    PermissionGuard,
  ],
})
export class AuthModule {}
