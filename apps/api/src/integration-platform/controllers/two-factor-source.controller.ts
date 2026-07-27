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
  TASK_TEMPLATES,
  type IntegrationCategory,
} from '@trycompai/integration-platform';
import { HybridAuthGuard } from '../../auth/hybrid-auth.guard';
import { PermissionGuard } from '../../auth/permission.guard';
import { RequirePermission } from '../../auth/require-permission.decorator';
import { OrganizationId } from '../../auth/auth-context.decorator';
import { CheckResultsService } from '../services/check-results.service';

/**
 * Only identity-provider integrations are meaningful per-employee 2FA sources:
 * they cover the whole workforce and key each person by email, so their results
 * align with the People roster. Gating on category (rather than a hand-maintained
 * list of slugs) means any future IdP in this category qualifies automatically,
 * while non-identity integrations that merely expose a 2FA check do not.
 */
const TWO_FA_SOURCE_CATEGORIES = new Set<IntegrationCategory>([
  'Identity & Access',
]);

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

    // The org row must exist before any provider semantics are evaluated, so a
    // stale/deleted org context always yields this endpoint's 404 contract
    // (otherwise a dead org's empty connection list reads as a 400
    // "not connected"). The P2025 catch below only covers a deletion racing
    // the update itself.
    const org = await db.organization.findUnique({
      where: { id: organizationId },
      select: { id: true },
    });
    if (!org) {
      throw new HttpException('Organization not found', HttpStatus.NOT_FOUND);
    }

    if (provider) {
      // Mirror the selector: only identity-provider sources are acceptable
      // (see TWO_FA_SOURCE_CATEGORIES / getAvailableTwoFactorSources).
      const sources = (
        await this.checkResults.listSourcesBoundToTask(
          organizationId,
          TASK_TEMPLATES.twoFactorAuth,
        )
      ).filter((s) => TWO_FA_SOURCE_CATEGORIES.has(s.category));
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

    try {
      await db.organization.update({
        where: { id: organizationId },
        data: { twoFactorSource: provider },
      });
    } catch (err) {
      // Stale/deleted org context: Prisma throws P2025 on a missing row — map
      // it to the same 404 as this controller's other org lookups, not a 500.
      if ((err as { code?: string }).code === 'P2025') {
        throw new HttpException('Organization not found', HttpStatus.NOT_FOUND);
      }
      throw err;
    }

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
    // Offer only identity-provider sources (see TWO_FA_SOURCE_CATEGORIES) — an
    // integration that merely exposes a 2FA check but isn't a workforce identity
    // provider doesn't map cleanly onto the People roster, so it's not shown.
    const providers = sources
      .filter((s) => TWO_FA_SOURCE_CATEGORIES.has(s.category))
      .map((s) => ({
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
    // Missing org context is an error, not "unconfigured" — keep it distinct
    // so callers never mistake invalid context for a valid empty state.
    if (!org) {
      throw new HttpException('Organization not found', HttpStatus.NOT_FOUND);
    }
    const source = org.twoFactorSource ?? null;
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

    // Dedupe by lowercased email. Result rows carry no ordering, so conflict
    // resolution must not depend on iteration order: a failing row always wins
    // (compliance-conservative — if any row says the user lacks 2FA, show
    // missing; never upgrade back to enabled).
    const byEmail = new Map<string, 'enabled' | 'missing'>();
    for (const result of results) {
      const email = result.resourceId.toLowerCase().trim();
      if (!email) continue;
      if (byEmail.get(email) === 'missing') continue;
      byEmail.set(email, result.passed ? 'enabled' : 'missing');
    }
    const statuses = Array.from(byEmail, ([email, status]) => ({
      email,
      status,
    }));

    return { configured: true, source, statuses };
  }
}
