import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  HttpException,
  HttpStatus,
  Logger,
  UseGuards,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { db } from '@db';
import { InternalTokenGuard } from '../../auth/internal-token.guard';
import { DynamicIntegrationRepository } from '../repositories/dynamic-integration.repository';
import { DynamicCheckRepository } from '../repositories/dynamic-check.repository';
import { ProviderRepository } from '../repositories/provider.repository';
import { CheckRunRepository } from '../repositories/check-run.repository';
import { DynamicManifestLoaderService } from '../services/dynamic-manifest-loader.service';
import {
  validateIntegrationDefinition,
  SyncDefinitionSchema,
} from '@trycompai/integration-platform';

@Controller({ path: 'internal/dynamic-integrations', version: '1' })
@UseGuards(InternalTokenGuard)
export class DynamicIntegrationsController {
  private readonly logger = new Logger(DynamicIntegrationsController.name);

  constructor(
    private readonly dynamicIntegrationRepo: DynamicIntegrationRepository,
    private readonly dynamicCheckRepo: DynamicCheckRepository,
    private readonly providerRepo: ProviderRepository,
    private readonly checkRunRepo: CheckRunRepository,
    private readonly loaderService: DynamicManifestLoaderService,
  ) {}

  /**
   * Upsert a dynamic integration with checks from a full definition.
   * Creates if new, updates if exists. This is the primary endpoint for AI agents.
   */
  @Put()
  async upsert(@Body() body: Record<string, unknown>) {
    const validation = validateIntegrationDefinition(body);
    if (!validation.success) {
      throw new HttpException(
        { message: 'Invalid integration definition', errors: validation.errors },
        HttpStatus.BAD_REQUEST,
      );
    }

    const def = validation.data!;

    // Validate and store syncDefinition through Zod to apply defaults (e.g., employeesPath)
    const rawSyncDef = (body as Record<string, unknown>).syncDefinition;
    const validatedSyncDef = rawSyncDef
      ? SyncDefinitionSchema.parse(rawSyncDef)
      : undefined;

    // Upsert the integration
    const integration = await this.dynamicIntegrationRepo.upsertBySlug({
      slug: def.slug,
      name: def.name,
      description: def.description,
      category: def.category,
      logoUrl: def.logoUrl,
      docsUrl: def.docsUrl,
      baseUrl: def.baseUrl,
      defaultHeaders: def.defaultHeaders as unknown as Prisma.InputJsonValue,
      authConfig: def.authConfig as unknown as Prisma.InputJsonValue,
      capabilities: def.capabilities as unknown as Prisma.InputJsonValue,
      supportsMultipleConnections: def.supportsMultipleConnections,
      syncDefinition: validatedSyncDef
        ? (JSON.parse(JSON.stringify(validatedSyncDef)) as Prisma.InputJsonValue)
        : null,
    });

    // Delete checks not in the new definition, then upsert the rest
    const existingChecks = await this.dynamicCheckRepo.findByIntegrationId(integration.id);
    const newCheckSlugs = new Set(def.checks.map((c) => c.checkSlug));
    for (const existing of existingChecks) {
      if (!newCheckSlugs.has(existing.checkSlug)) {
        await this.dynamicCheckRepo.delete(existing.id);
      }
    }

    for (const [index, check] of def.checks.entries()) {
      await this.dynamicCheckRepo.upsert({
        integrationId: integration.id,
        checkSlug: check.checkSlug,
        name: check.name,
        description: check.description,
        taskMapping: check.taskMapping,
        defaultSeverity: check.defaultSeverity,
        definition: check.definition as unknown as Prisma.InputJsonValue,
        variables: (check.variables ?? []) as unknown as Prisma.InputJsonValue,
        isEnabled: check.isEnabled ?? true,
        sortOrder: check.sortOrder ?? index,
      });
    }

    // Upsert IntegrationProvider row
    await this.providerRepo.upsert({
      slug: def.slug,
      name: def.name,
      category: def.category,
      capabilities: (def.capabilities as unknown as string[]) ?? ['checks'],
      isActive: true,
    });

    // Refresh registry
    await this.loaderService.invalidateCache();

    this.logger.log(`Upserted dynamic integration: ${def.slug} with ${def.checks.length} checks`);

    return {
      success: true,
      id: integration.id,
      slug: integration.slug,
      checksCount: def.checks.length,
    };
  }

  /**
   * Create a dynamic integration with checks from a full definition.
   */
  @Post()
  async create(@Body() body: Record<string, unknown>) {
    const validation = validateIntegrationDefinition(body);
    if (!validation.success) {
      throw new HttpException(
        { message: 'Invalid integration definition', errors: validation.errors },
        HttpStatus.BAD_REQUEST,
      );
    }

    const def = validation.data!;

    const existing = await this.dynamicIntegrationRepo.findBySlug(def.slug);
    if (existing) {
      throw new HttpException(
        `Integration with slug "${def.slug}" already exists. Use PUT to upsert.`,
        HttpStatus.CONFLICT,
      );
    }

    const rawSyncDefCreate = (body as Record<string, unknown>).syncDefinition;
    const validatedSyncDefCreate = rawSyncDefCreate
      ? SyncDefinitionSchema.parse(rawSyncDefCreate)
      : undefined;
    const integration = await this.dynamicIntegrationRepo.create({
      slug: def.slug,
      name: def.name,
      description: def.description,
      category: def.category,
      logoUrl: def.logoUrl,
      docsUrl: def.docsUrl,
      baseUrl: def.baseUrl,
      defaultHeaders: def.defaultHeaders as unknown as Prisma.InputJsonValue,
      authConfig: def.authConfig as unknown as Prisma.InputJsonValue,
      capabilities: def.capabilities as unknown as Prisma.InputJsonValue,
      supportsMultipleConnections: def.supportsMultipleConnections,
      syncDefinition: validatedSyncDefCreate
        ? (JSON.parse(JSON.stringify(validatedSyncDefCreate)) as Prisma.InputJsonValue)
        : undefined,
    });

    for (const [index, check] of def.checks.entries()) {
      await this.dynamicCheckRepo.create({
        integrationId: integration.id,
        checkSlug: check.checkSlug,
        name: check.name,
        description: check.description,
        taskMapping: check.taskMapping,
        defaultSeverity: check.defaultSeverity,
        definition: check.definition as unknown as Prisma.InputJsonValue,
        variables: (check.variables ?? []) as unknown as Prisma.InputJsonValue,
        isEnabled: check.isEnabled ?? true,
        sortOrder: check.sortOrder ?? index,
      });
    }

    // Create provider row and refresh registry
    await this.providerRepo.upsert({
      slug: def.slug,
      name: def.name,
      category: def.category,
      capabilities: (def.capabilities as unknown as string[]) ?? ['checks'],
      isActive: true,
    });

    await this.loaderService.invalidateCache();

    this.logger.log(`Created dynamic integration: ${def.slug} with ${def.checks.length} checks`);

    return { success: true, id: integration.id, slug: integration.slug };
  }

  /**
   * List all dynamic integrations.
   */
  @Get()
  async list() {
    const integrations = await this.dynamicIntegrationRepo.findAll();
    return integrations.map((i) => ({
      id: i.id,
      slug: i.slug,
      name: i.name,
      description: i.description,
      category: i.category,
      isActive: i.isActive,
      checksCount: i.checks.length,
      createdAt: i.createdAt,
      updatedAt: i.updatedAt,
    }));
  }

  /**
   * Get details of a dynamic integration with all checks.
   */
  @Get(':id')
  async getById(@Param('id') id: string) {
    const integration = await this.dynamicIntegrationRepo.findById(id);
    if (!integration) {
      throw new HttpException('Dynamic integration not found', HttpStatus.NOT_FOUND);
    }
    return integration;
  }

  /**
   * Update manifest fields of a dynamic integration.
   */
  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    const existing = await this.dynamicIntegrationRepo.findById(id);
    if (!existing) {
      throw new HttpException('Dynamic integration not found', HttpStatus.NOT_FOUND);
    }

    await this.dynamicIntegrationRepo.update(id, body);
    await this.loaderService.invalidateCache();

    return { success: true };
  }

  /**
   * Delete a dynamic integration (cascades to checks).
   */
  @Delete(':id')
  async remove(@Param('id') id: string) {
    const existing = await this.dynamicIntegrationRepo.findById(id);
    if (!existing) {
      throw new HttpException('Dynamic integration not found', HttpStatus.NOT_FOUND);
    }

    await this.dynamicIntegrationRepo.delete(id);
    await this.loaderService.invalidateCache();

    this.logger.log(`Deleted dynamic integration: ${existing.slug}`);
    return { success: true };
  }

  // ==================== Check Management ====================

  /**
   * Add a check to a dynamic integration.
   */
  @Post(':id/checks')
  async addCheck(
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    const integration = await this.dynamicIntegrationRepo.findById(id);
    if (!integration) {
      throw new HttpException('Dynamic integration not found', HttpStatus.NOT_FOUND);
    }

    const check = await this.dynamicCheckRepo.create({
      integrationId: id,
      checkSlug: body.checkSlug as string,
      name: body.name as string,
      description: body.description as string,
      taskMapping: body.taskMapping as string | undefined,
      defaultSeverity: body.defaultSeverity as string | undefined,
      definition: body.definition as Prisma.InputJsonValue,
      variables: body.variables as Prisma.InputJsonValue | undefined,
      isEnabled: (body.isEnabled as boolean) ?? true,
      sortOrder: (body.sortOrder as number) ?? 0,
    });

    await this.loaderService.invalidateCache();

    return { success: true, id: check.id };
  }

  /**
   * Update a check.
   */
  @Patch(':id/checks/:checkId')
  async updateCheck(
    @Param('id') id: string,
    @Param('checkId') checkId: string,
    @Body() body: Record<string, unknown>,
  ) {
    const check = await this.dynamicCheckRepo.findById(checkId);
    if (!check || check.integrationId !== id) {
      throw new HttpException('Check not found', HttpStatus.NOT_FOUND);
    }

    await this.dynamicCheckRepo.update(checkId, body);
    await this.loaderService.invalidateCache();

    return { success: true };
  }

  /**
   * Delete a check.
   */
  @Delete(':id/checks/:checkId')
  async removeCheck(
    @Param('id') id: string,
    @Param('checkId') checkId: string,
  ) {
    const check = await this.dynamicCheckRepo.findById(checkId);
    if (!check || check.integrationId !== id) {
      throw new HttpException('Check not found', HttpStatus.NOT_FOUND);
    }

    await this.dynamicCheckRepo.delete(checkId);
    await this.loaderService.invalidateCache();

    return { success: true };
  }

  // ==================== Activation ====================

  /**
   * Activate a dynamic integration.
   */
  @Post(':id/activate')
  async activate(@Param('id') id: string) {
    const integration = await this.dynamicIntegrationRepo.findById(id);
    if (!integration) {
      throw new HttpException('Dynamic integration not found', HttpStatus.NOT_FOUND);
    }

    for (const check of integration.checks) {
      if (!check.definition || typeof check.definition !== 'object') {
        throw new HttpException(
          `Check "${check.checkSlug}" has invalid definition`,
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    await this.providerRepo.upsert({
      slug: integration.slug,
      name: integration.name,
      category: integration.category,
      capabilities: (integration.capabilities as unknown as string[]) ?? ['checks'],
      isActive: true,
    });

    await this.dynamicIntegrationRepo.update(id, { isActive: true });
    await this.loaderService.invalidateCache();

    this.logger.log(`Activated dynamic integration: ${integration.slug}`);
    return { success: true };
  }

  /**
   * Deactivate a dynamic integration.
   */
  @Post(':id/deactivate')
  async deactivate(@Param('id') id: string) {
    const integration = await this.dynamicIntegrationRepo.findById(id);
    if (!integration) {
      throw new HttpException('Dynamic integration not found', HttpStatus.NOT_FOUND);
    }

    await this.dynamicIntegrationRepo.update(id, { isActive: false });
    await this.loaderService.invalidateCache();

    this.logger.log(`Deactivated dynamic integration: ${integration.slug}`);
    return { success: true };
  }

  // ==================== Agent Debugging Endpoints ====================

  /**
   * Validate a definition without saving.
   * Agents use this to check syntax/structure before committing.
   */
  @Post('validate')
  async validate(@Body() body: Record<string, unknown>) {
    const result = validateIntegrationDefinition(body);

    if (!result.success) {
      return {
        valid: false,
        errors: result.errors,
      };
    }

    // validateIntegrationDefinition validates everything via Zod:
    // the manifest fields, all check definitions, and syncDefinition.
    // If we got here, the entire definition is valid.
    const definition = result.data!;

    return {
      valid: true,
      summary: {
        slug: definition.slug,
        name: definition.name,
        category: definition.category,
        capabilities: definition.capabilities,
        checksCount: definition.checks.length,
        checkSlugs: definition.checks.map((c) => c.checkSlug),
        hasSyncDefinition: !!(body as Record<string, unknown>).syncDefinition,
      },
    };
  }

  /**
   * Get recent check run history for a dynamic integration.
   * Agents use this to debug failing checks — includes full logs and results.
   */
  @Get(':id/check-runs')
  async getCheckRuns(@Param('id') id: string) {
    const integration = await this.dynamicIntegrationRepo.findById(id);
    if (!integration) {
      throw new HttpException('Dynamic integration not found', HttpStatus.NOT_FOUND);
    }

    // Find all connections for this provider
    const connections = await db.integrationConnection.findMany({
      where: {
        provider: { slug: integration.slug },
        status: 'active',
      },
      select: { id: true, organizationId: true },
    });

    if (connections.length === 0) {
      return { runs: [], total: 0 };
    }

    // Get recent runs across all connections
    const runs = await db.integrationCheckRun.findMany({
      where: {
        connectionId: { in: connections.map((c) => c.id) },
      },
      include: {
        results: {
          select: {
            id: true,
            passed: true,
            title: true,
            resourceType: true,
            resourceId: true,
            severity: true,
            remediation: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return {
      runs: runs.map((run) => ({
        id: run.id,
        checkId: run.checkId,
        checkName: run.checkName,
        connectionId: run.connectionId,
        status: run.status,
        startedAt: run.startedAt,
        completedAt: run.completedAt,
        durationMs: run.durationMs,
        totalChecked: run.totalChecked,
        passedCount: run.passedCount,
        failedCount: run.failedCount,
        errorMessage: run.errorMessage,
        logs: run.logs,
        results: run.results,
      })),
      total: runs.length,
    };
  }

  /**
   * Get a single check run with full details (logs, results, error info).
   * Agents use this to debug a specific failed run.
   */
  @Get('check-runs/:runId')
  async getCheckRunById(@Param('runId') runId: string) {
    const run = await this.checkRunRepo.findById(runId);
    if (!run) {
      throw new HttpException('Check run not found', HttpStatus.NOT_FOUND);
    }

    return {
      id: run.id,
      checkId: run.checkId,
      checkName: run.checkName,
      connectionId: run.connectionId,
      status: run.status,
      startedAt: run.startedAt,
      completedAt: run.completedAt,
      durationMs: run.durationMs,
      totalChecked: run.totalChecked,
      passedCount: run.passedCount,
      failedCount: run.failedCount,
      errorMessage: run.errorMessage,
      logs: run.logs,
      results: run.results,
      provider: run.connection?.provider
        ? { slug: run.connection.provider.slug, name: run.connection.provider.name }
        : null,
    };
  }
}
