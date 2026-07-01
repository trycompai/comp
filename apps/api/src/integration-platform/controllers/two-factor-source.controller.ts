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
import {
  registry,
  TASK_TEMPLATES,
  type IntegrationManifest,
} from '@trycompai/integration-platform';
import { HybridAuthGuard } from '../../auth/hybrid-auth.guard';
import { PermissionGuard } from '../../auth/permission.guard';
import { RequirePermission } from '../../auth/require-permission.decorator';
import { OrganizationId } from '../../auth/auth-context.decorator';
import { ConnectionRepository } from '../repositories/connection.repository';
import { CheckRunRepository } from '../repositories/check-run.repository';

/** The check on a manifest that feeds the 2FA evidence task, if any. */
function twoFactorCheckOf(manifest: IntegrationManifest) {
  return (
    manifest.checks?.find(
      (check) => check.taskMapping === TASK_TEMPLATES.twoFactorAuth,
    ) ?? null
  );
}

/**
 * Every active manifest — codebase OR dynamic — whose check is bound to the 2FA
 * task. Dynamic manifests are merged into the same registry, so this is uniformly
 * universal: any integration that ships a 2FA check becomes an eligible source
 * with zero per-integration wiring.
 */
function manifestsWithTwoFactorCheck(): IntegrationManifest[] {
  return registry.getActiveManifests().filter((m) => !!twoFactorCheckOf(m));
}

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
      'Provider slug whose 2FA check feeds the People-tab 2FA column (must have a check bound to the 2FA task — call available-2fa-sources for options). Pass null or omit to clear the source.',
    example: 'google-workspace',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  provider?: string | null;
}

@Controller({ path: 'integrations/sync', version: '1' })
@ApiTags('Integrations')
@UseGuards(HybridAuthGuard, PermissionGuard)
@ApiSecurity('apikey')
export class TwoFactorSourceController {
  private readonly logger = new Logger(TwoFactorSourceController.name);

  constructor(
    private readonly connectionRepository: ConnectionRepository,
    private readonly checkRunRepo: CheckRunRepository,
  ) {}

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
      const validProviders = manifestsWithTwoFactorCheck().map((m) => m.id);
      if (!validProviders.includes(provider)) {
        throw new HttpException(
          `Invalid 2FA source. Must be one of: ${validProviders.join(', ')}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      const connection = await this.connectionRepository.findBySlugAndOrg(
        provider,
        organizationId,
      );
      if (!connection || connection.status !== 'active') {
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
    const sources = manifestsWithTwoFactorCheck();
    const providers = await Promise.all(
      sources.map(async (m) => {
        const connection = await db.integrationConnection.findFirst({
          where: { organizationId, status: 'active', provider: { slug: m.id } },
          select: { id: true, lastSyncAt: true, nextSyncAt: true },
        });
        return {
          slug: m.id,
          name: m.name,
          logoUrl: m.logoUrl,
          connected: !!connection,
          connectionId: connection?.id ?? null,
          lastSyncAt: connection?.lastSyncAt?.toISOString() ?? null,
          nextSyncAt: connection?.nextSyncAt?.toISOString() ?? null,
        };
      }),
    );
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

    const manifest = manifestsWithTwoFactorCheck().find((m) => m.id === source);
    const check = manifest ? twoFactorCheckOf(manifest) : null;
    if (!check) {
      // Source no longer offers a 2FA check (removed/disabled) — treat as unset.
      return { configured: false, source, statuses: [] };
    }

    const connection = await this.connectionRepository.findBySlugAndOrg(
      source,
      organizationId,
    );
    if (!connection) {
      return { configured: true, source, statuses: [] };
    }

    const latest = await this.checkRunRepo.findLatestUserResultsByConnectionAndCheck({
      connectionId: connection.id,
      checkId: check.id,
      organizationId,
    });
    if (!latest) {
      return { configured: true, source, statuses: [] };
    }

    // Dedupe by lowercased email (results aren't ordered; last row wins).
    const byEmail = new Map<string, 'enabled' | 'missing'>();
    for (const result of latest.results) {
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
