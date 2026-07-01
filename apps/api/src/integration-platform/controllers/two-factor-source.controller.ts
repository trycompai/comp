import {
  Controller,
  Get,
  Post,
  Body,
  HttpException,
  HttpStatus,
  Logger,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiPropertyOptional,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { db } from '@db';
import { TASK_TEMPLATES } from '@trycompai/integration-platform';
import { HybridAuthGuard } from '../../auth/hybrid-auth.guard';
import { PermissionGuard } from '../../auth/permission.guard';
import { RequirePermission } from '../../auth/require-permission.decorator';
import { OrganizationId } from '../../auth/auth-context.decorator';
import { CheckResultsService } from '../services/check-results.service';

// Body for POST /v1/integrations/sync/two-factor-source. Pass a provider slug to
// set the org's 2FA source, or null/omit to clear it. Class (not inline type) so
// swagger + the ValidationPipe whitelist accept it.
class SetTwoFactorSourceDto {
  // UI sends organizationId in the body; ignored by the handler (derived from auth).
  @ApiPropertyOptional({
    description:
      'Auto-resolved from your API key / session. You can omit this; it is ignored by the server.',
  })
  @IsOptional()
  @IsString()
  organizationId?: string;

  @ApiPropertyOptional({
    description:
      'Provider slug whose 2FA check feeds the People-tab 2FA column (must be bound to the 2FA task — call available-2fa-sources for options). Pass null or omit to clear the source.',
    example: 'google-workspace',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  provider?: string | null;
}

/**
 * 2FA source configuration + per-employee 2FA status for the People tab.
 *
 * This controller owns only the 2FA-SPECIFIC concerns: the org's chosen source
 * (`Organization.twoFactorSource`) and the enabled/missing interpretation. All
 * the generic "read an integration check's results" work is delegated to
 * {@link CheckResultsService} — it is consumer #1 of that universal service.
 */
@Controller({ path: 'integrations/sync', version: '1' })
@ApiTags('Integrations')
@UseGuards(HybridAuthGuard, PermissionGuard)
@ApiSecurity('apikey')
export class TwoFactorSourceController {
  private readonly logger = new Logger(TwoFactorSourceController.name);

  constructor(private readonly checkResults: CheckResultsService) {}

  /**
   * Get the currently configured 2FA source provider.
   */
  @Get('two-factor-source')
  @ApiOperation({ summary: 'Get the configured 2FA source provider' })
  @RequirePermission('integration', 'read')
  async getTwoFactorSource(@OrganizationId() organizationId: string) {
    const org = await db.organization.findUnique({
      where: { id: organizationId },
      select: { twoFactorSource: true },
    });
    if (!org) {
      throw new HttpException('Organization not found', HttpStatus.NOT_FOUND);
    }
    return { provider: org.twoFactorSource };
  }

  /**
   * Set (or clear) the org's 2FA source provider.
   */
  @Post('two-factor-source')
  @ApiOperation({ summary: 'Set the 2FA source provider' })
  @ApiBody({ type: SetTwoFactorSourceDto })
  @RequirePermission('integration', 'update')
  async setTwoFactorSource(
    @OrganizationId() organizationId: string,
    @Body() body: SetTwoFactorSourceDto,
  ) {
    // Only an explicit string (set) or null (clear) are valid. Reject anything
    // else — non-string, or blank/whitespace — with a 400 rather than silently
    // coercing it to null and clearing the org's configured source.
    const rawProvider = body.provider;
    if (
      rawProvider !== null &&
      rawProvider !== undefined &&
      (typeof rawProvider !== 'string' || rawProvider.trim().length === 0)
    ) {
      throw new HttpException(
        'provider must be a non-empty string or null',
        HttpStatus.BAD_REQUEST,
      );
    }
    const provider = rawProvider ? rawProvider.trim() : null;

    if (provider) {
      const sources = await this.checkResults.listSourcesBoundToTask(
        organizationId,
        TASK_TEMPLATES.twoFactorAuth,
      );
      const source = sources.find((s) => s.slug === provider);
      if (!source) {
        throw new HttpException(
          `Invalid 2FA source. Must be one of: ${sources.map((s) => s.slug).join(', ')}`,
          HttpStatus.BAD_REQUEST,
        );
      }
      if (!source.connected) {
        throw new HttpException(
          `Provider ${provider} is not connected`,
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    await db.organization.update({
      where: { id: organizationId },
      data: { twoFactorSource: provider },
    });

    this.logger.log(
      `Set 2FA source to ${provider ?? 'none'} for org ${organizationId}`,
    );
    return { success: true, provider };
  }

  /**
   * List integrations that can supply per-user 2FA status (all bound to the 2FA
   * task), with each one's connection state for this org.
   */
  @Get('available-2fa-sources')
  @ApiOperation({ summary: 'List integrations that can supply per-user 2FA status' })
  @RequirePermission('integration', 'read')
  async getAvailableTwoFactorSources(@OrganizationId() organizationId: string) {
    const sources = await this.checkResults.listSourcesBoundToTask(
      organizationId,
      TASK_TEMPLATES.twoFactorAuth,
    );
    // Expose only what the selector needs (drop the internal checkId).
    const providers = sources.map((s) => ({
      slug: s.slug,
      name: s.name,
      logoUrl: s.logoUrl,
      connected: s.connected,
      connectionId: s.connectionId,
      lastSyncAt: s.lastSyncAt,
      nextSyncAt: s.nextSyncAt,
    }));
    return { providers };
  }

  /**
   * Per-user 2FA status from the configured source's latest real check run.
   *
   * Returns only emails that had a result row; the People tab resolves any
   * member without a matching row to "Not provided". Emails are lowercased to
   * match the (lowercased) member emails on the join.
   */
  @Get('two-factor-statuses')
  @ApiOperation({ summary: 'Per-user 2FA status from the configured source' })
  @RequirePermission('integration', 'read')
  async getTwoFactorStatuses(@OrganizationId() organizationId: string) {
    const org = await db.organization.findUnique({
      where: { id: organizationId },
      select: { twoFactorSource: true },
    });
    const source = org?.twoFactorSource ?? null;
    if (!source) {
      return { configured: false, source: null, statuses: [] };
    }

    // Delegate the generic fetch; interpret 'user' rows here (2FA's concern).
    const results = await this.checkResults.getLatestResultsForTask({
      organizationId,
      taskTemplateId: TASK_TEMPLATES.twoFactorAuth,
      sourceSlug: source,
      resourceType: 'user',
    });

    // Dedupe by lowercased email (results aren't ordered; last row wins).
    const byEmail = new Map<string, 'enabled' | 'missing'>();
    for (const result of results) {
      const email = result.resourceId.toLowerCase().trim();
      if (!email) continue;
      byEmail.set(email, result.passed ? 'enabled' : 'missing');
    }
    const statuses = Array.from(byEmail, ([email, status]) => ({
      email,
      status,
    }));

    return { configured: true, source, statuses };
  }
}
