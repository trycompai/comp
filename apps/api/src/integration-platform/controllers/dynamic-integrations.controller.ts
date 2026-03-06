import {
  Controller,
  Get,
  Post,
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
import { PlatformAdminGuard } from '../../auth/platform-admin.guard';
import { DynamicIntegrationRepository } from '../repositories/dynamic-integration.repository';
import { DynamicCheckRepository } from '../repositories/dynamic-check.repository';
import { ProviderRepository } from '../repositories/provider.repository';
import { DynamicManifestLoaderService } from '../services/dynamic-manifest-loader.service';
import { validateIntegrationDefinition } from '@comp/integration-platform';

const DYNAMIC_INTEGRATION_UPDATE_FIELDS = [
  'slug',
  'name',
  'description',
  'category',
  'logoUrl',
  'docsUrl',
  'baseUrl',
  'defaultHeaders',
  'authConfig',
  'capabilities',
  'supportsMultipleConnections',
  'isActive',
] as const;

const DYNAMIC_CHECK_UPDATE_FIELDS = [
  'checkSlug',
  'name',
  'description',
  'taskMapping',
  'defaultSeverity',
  'definition',
  'variables',
  'isEnabled',
  'sortOrder',
] as const;

@Controller({ path: 'admin/dynamic-integrations', version: '1' })
@UseGuards(PlatformAdminGuard)
export class DynamicIntegrationsController {
  private readonly logger = new Logger(DynamicIntegrationsController.name);

  constructor(
    private readonly dynamicIntegrationRepo: DynamicIntegrationRepository,
    private readonly dynamicCheckRepo: DynamicCheckRepository,
    private readonly providerRepo: ProviderRepository,
    private readonly loaderService: DynamicManifestLoaderService,
  ) {}

  /**
   * Create a dynamic integration with checks from a full definition.
   */
  @Post()
  async create(@Body() body: Record<string, unknown>) {
    // Validate with Zod
    const validation = validateIntegrationDefinition(body);
    if (!validation.success) {
      throw new HttpException(
        {
          message: 'Invalid integration definition',
          errors: validation.errors,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const def = validation.data!;

    // Check for duplicate slug
    const existing = await this.dynamicIntegrationRepo.findBySlug(def.slug);
    if (existing) {
      throw new HttpException(
        `Integration with slug "${def.slug}" already exists`,
        HttpStatus.CONFLICT,
      );
    }

    // Create the integration
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
    });

    // Create checks
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

    this.logger.log(
      `Created dynamic integration: ${def.slug} with ${def.checks.length} checks`,
    );

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
      throw new HttpException(
        'Dynamic integration not found',
        HttpStatus.NOT_FOUND,
      );
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
      throw new HttpException(
        'Dynamic integration not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const data = this.buildIntegrationUpdateData(body);
    await this.dynamicIntegrationRepo.update(id, data);
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
      throw new HttpException(
        'Dynamic integration not found',
        HttpStatus.NOT_FOUND,
      );
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
      throw new HttpException(
        'Dynamic integration not found',
        HttpStatus.NOT_FOUND,
      );
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

    const data = this.buildCheckUpdateData(body);
    await this.dynamicCheckRepo.update(checkId, data);
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
   * Validates checks, upserts IntegrationProvider row, and refreshes registry.
   */
  @Post(':id/activate')
  async activate(@Param('id') id: string) {
    const integration = await this.dynamicIntegrationRepo.findById(id);
    if (!integration) {
      throw new HttpException(
        'Dynamic integration not found',
        HttpStatus.NOT_FOUND,
      );
    }

    // Validate all checks
    for (const check of integration.checks) {
      if (!check.definition || typeof check.definition !== 'object') {
        throw new HttpException(
          `Check "${check.checkSlug}" has invalid definition`,
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    // Upsert IntegrationProvider row (so connections can be created)
    await this.providerRepo.upsert({
      slug: integration.slug,
      name: integration.name,
      category: integration.category,
      capabilities: (integration.capabilities as unknown as string[]) ?? [
        'checks',
      ],
      isActive: true,
    });

    // Set isActive=true
    await this.dynamicIntegrationRepo.update(id, { isActive: true });

    // Refresh registry
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
      throw new HttpException(
        'Dynamic integration not found',
        HttpStatus.NOT_FOUND,
      );
    }

    await this.dynamicIntegrationRepo.update(id, { isActive: false });
    await this.loaderService.invalidateCache();

    this.logger.log(`Deactivated dynamic integration: ${integration.slug}`);
    return { success: true };
  }

  private buildIntegrationUpdateData(
    body: Record<string, unknown>,
  ): Prisma.DynamicIntegrationUpdateInput {
    this.assertNoUnknownFields(body, DYNAMIC_INTEGRATION_UPDATE_FIELDS);

    const data = this.pickAllowedFields(
      body,
      DYNAMIC_INTEGRATION_UPDATE_FIELDS,
    );

    if (Object.keys(data).length === 0) {
      throw new HttpException(
        'No valid fields provided for update',
        HttpStatus.BAD_REQUEST,
      );
    }

    return data as Prisma.DynamicIntegrationUpdateInput;
  }

  private buildCheckUpdateData(
    body: Record<string, unknown>,
  ): Prisma.DynamicCheckUpdateInput {
    this.assertNoUnknownFields(body, DYNAMIC_CHECK_UPDATE_FIELDS);

    const data = this.pickAllowedFields(body, DYNAMIC_CHECK_UPDATE_FIELDS);

    if (Object.keys(data).length === 0) {
      throw new HttpException(
        'No valid fields provided for update',
        HttpStatus.BAD_REQUEST,
      );
    }

    return data as Prisma.DynamicCheckUpdateInput;
  }

  private assertNoUnknownFields(
    body: Record<string, unknown>,
    allowedFields: readonly string[],
  ) {
    const unknownFields = Object.keys(body).filter(
      (field) => !allowedFields.includes(field),
    );

    if (unknownFields.length > 0) {
      throw new HttpException(
        `Unknown fields in update payload: ${unknownFields.join(', ')}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private pickAllowedFields(
    body: Record<string, unknown>,
    allowedFields: readonly string[],
  ): Record<string, unknown> {
    const data: Record<string, unknown> = {};

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        data[field] = body[field];
      }
    }

    return data;
  }
}
