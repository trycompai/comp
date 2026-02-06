import { Module } from '@nestjs/common';
import { AuthModule as BetterAuthModule } from '@thallesp/nestjs-better-auth';
import { auth } from './auth.server';
import { ApiKeyGuard } from './api-key.guard';
import { ApiKeyService } from './api-key.service';
import { HybridAuthGuard } from './hybrid-auth.guard';
import { PermissionGuard } from './permission.guard';

@Module({
  imports: [
    // Better Auth NestJS integration - handles /api/auth/* routes
    BetterAuthModule.forRoot({
      auth,
      // Don't register global auth guard - we use HybridAuthGuard
      disableGlobalAuthGuard: true,
    }),
  ],
  providers: [
    ApiKeyService,
    ApiKeyGuard,
    HybridAuthGuard,
    PermissionGuard,
  ],
  exports: [
    ApiKeyService,
    ApiKeyGuard,
    HybridAuthGuard,
    PermissionGuard,
    BetterAuthModule,
  ],
})
export class AuthModule {}
