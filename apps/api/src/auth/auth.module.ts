import { Module } from '@nestjs/common';
import { AuthModule as BetterAuthModule } from '@thallesp/nestjs-better-auth';
import { auth } from './auth.server';
import { ApiKeyGuard } from './api-key.guard';
import { ApiKeyService } from './api-key.service';
import { AuthController } from './auth.controller';
import { HybridAuthGuard } from './hybrid-auth.guard';
import { PermissionGuard } from './permission.guard';

@Module({
  imports: [
    // Better Auth NestJS integration - handles /api/auth/* routes
    BetterAuthModule.forRoot({
      auth,
      // Don't register global auth guard - we use HybridAuthGuard
      disableGlobalAuthGuard: true,
      // CORS is already configured in main.ts — prevent the module from
      // overriding it with its own trustedOrigins-based CORS.
      disableTrustedOriginsCors: true,
      // Body parsing for non-auth routes is handled in main.ts with a
      // custom middleware that skips /api/auth paths. Disable the module's
      // own SkipBodyParsingMiddleware to avoid conflicts.
      disableBodyParser: true,
    }),
  ],
  controllers: [AuthController],
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
