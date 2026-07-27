import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { db } from '@db';
import { HybridAuthGuard } from '../../auth/hybrid-auth.guard';
import { PermissionGuard } from '../../auth/permission.guard';
import { RequirePermission } from '../../auth/require-permission.decorator';
import { OrganizationId, UserId } from '../../auth/auth-context.decorator';

class RecordOAuthErrorDto {
  @IsString()
  @MaxLength(100)
  providerSlug!: string;

  /** OAuth error code from the provider redirect (e.g. "access_denied"). */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  error?: string;

  /** Human-readable error description from the provider redirect. */
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  errorDescription?: string;
}

/**
 * Records an OAuth callback error that the frontend captured from the redirect
 * URL (`?error=...&error_description=...`). This is the *capture* side of OAuth
 * error visibility — it does NOT touch the shared OAuth callback flow. The
 * stored rows are read back via the internal debug API
 * (`GET /internal/integration-debug/oauth-errors`).
 *
 * Never receives or stores secrets: the frontend only forwards the error code +
 * description, never the auth `code` or any token.
 */
@ApiExcludeController()
@Controller({ path: 'integrations/oauth-errors', version: '1' })
@UseGuards(HybridAuthGuard, PermissionGuard)
export class OAuthErrorsController {
  @Post()
  @RequirePermission('integration', 'create')
  async record(
    @OrganizationId() organizationId: string,
    @UserId() userId: string | undefined,
    @Body() body: RecordOAuthErrorDto,
  ): Promise<{ recorded: true }> {
    await db.integrationOAuthError.create({
      data: {
        organizationId,
        userId: userId ?? null,
        providerSlug: body.providerSlug,
        errorCode: body.error ?? null,
        errorDescription: body.errorDescription ?? null,
      },
    });
    return { recorded: true };
  }
}
