import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import { HybridAuthGuard } from '../auth/hybrid-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { RequirePermission } from '../auth/require-permission.decorator';
import { SkipOrgCheck } from '../auth/skip-org-check.decorator';
import {
  AuthContext,
  OrganizationId,
  OrganizationIdOptional,
} from '../auth/auth-context.decorator';
import type { AuthContext as AuthContextType } from '../auth/types';
import { FrameworksService } from './frameworks.service';
import { AddFrameworksDto } from './dto/add-frameworks.dto';
import { CreateCustomFrameworkDto } from './dto/create-custom-framework.dto';
import { UpdateCustomFrameworkDto } from './dto/update-custom-framework.dto';
import { CreateCustomRequirementDto } from './dto/create-custom-requirement.dto';
import { LinkRequirementsDto } from './dto/link-requirements.dto';
import { LinkControlsDto } from './dto/link-controls.dto';
import { SyncFrameworkDto } from './dto/sync-framework.dto';
import { RollbackFrameworkDto } from './dto/rollback-framework.dto';
import { FrameworkSyncService } from './framework-versioning/framework-sync.service';
import { FrameworkRollbackService } from './framework-versioning/framework-rollback.service';

@ApiTags('Frameworks')
@ApiBearerAuth()
@UseGuards(HybridAuthGuard, PermissionGuard)
@Controller({ path: 'frameworks', version: '1' })
export class FrameworksController {
  constructor(
    private readonly frameworksService: FrameworksService,
    private readonly syncService: FrameworkSyncService,
    private readonly rollbackService: FrameworkRollbackService,
  ) {}

  @Get()
  @RequirePermission('framework', 'read')
  @ApiOperation({ summary: 'List framework instances for the organization' })
  @ApiQuery({ name: 'includeControls', required: false, type: Boolean })
  @ApiQuery({ name: 'includeScores', required: false, type: Boolean })
  async findAll(
    @OrganizationId() organizationId: string,
    @Query('includeControls') includeControls?: string,
    @Query('includeScores') includeScores?: string,
  ) {
    const data = await this.frameworksService.findAll(organizationId, {
      includeControls: includeControls === 'true',
      includeScores: includeScores === 'true',
    });
    return { data, count: data.length };
  }

  @Get('available')
  @SkipOrgCheck()
  @ApiOperation({
    summary:
      'List available frameworks (requires session, no active org needed — used during onboarding)',
  })
  async findAvailable(@OrganizationIdOptional() organizationId?: string) {
    const data = await this.frameworksService.findAvailable(organizationId);
    return { data, count: data.length };
  }

  @Get('scores')
  @RequirePermission('framework', 'read')
  @ApiOperation({ summary: 'Get overview compliance scores' })
  async getScores(
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
  ) {
    return this.frameworksService.getScores(organizationId, authContext.userId);
  }

  @Get('update-statuses')
  @RequirePermission('framework', 'read')
  @ApiOperation({ summary: 'Get update statuses for all framework instances' })
  async getAllUpdateStatuses(@OrganizationId() organizationId: string) {
    const data =
      await this.frameworksService.getAllUpdateStatuses(organizationId);
    return { data, count: data.length };
  }

  @Get(':id')
  @RequirePermission('framework', 'read')
  @ApiOperation({ summary: 'Get a single framework instance with full detail' })
  async findOne(
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
  ) {
    return this.frameworksService.findOne(id, organizationId);
  }

  @Get(':id/requirements/:requirementKey')
  @RequirePermission('framework', 'read')
  @ApiOperation({ summary: 'Get a specific requirement with related controls' })
  async findRequirement(
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
    @Param('requirementKey') requirementKey: string,
  ) {
    return this.frameworksService.findRequirement(
      id,
      requirementKey,
      organizationId,
    );
  }

  @Post()
  @RequirePermission('framework', 'create')
  @ApiOperation({ summary: 'Add frameworks to the organization' })
  async addFrameworks(
    @OrganizationId() organizationId: string,
    @Body() dto: AddFrameworksDto,
    @AuthContext() authContext: AuthContextType,
  ) {
    return this.frameworksService.addFrameworks(
      organizationId,
      dto.frameworkIds,
      authContext.memberId,
    );
  }

  @Post('custom')
  @RequirePermission('framework', 'create')
  @ApiOperation({ summary: 'Create a custom framework for this organization' })
  async createCustom(
    @OrganizationId() organizationId: string,
    @Body() dto: CreateCustomFrameworkDto,
  ) {
    return this.frameworksService.createCustom(organizationId, dto);
  }

  @Patch(':id/custom')
  @RequirePermission('framework', 'update')
  @ApiOperation({
    summary: 'Update a custom framework',
    description:
      "Update the name and/or description of an organization's custom framework. Only custom frameworks are editable; platform frameworks return 400.",
  })
  @ApiBody({ type: UpdateCustomFrameworkDto })
  async updateCustom(
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCustomFrameworkDto,
  ) {
    return this.frameworksService.updateCustom(id, organizationId, dto);
  }

  @Post(':id/requirements')
  @RequirePermission('framework', 'update')
  @ApiOperation({ summary: 'Add a custom requirement to a framework instance' })
  async createRequirement(
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
    @Body() dto: CreateCustomRequirementDto,
  ) {
    return this.frameworksService.createRequirement(id, organizationId, dto);
  }

  @Post(':id/requirements/link')
  @RequirePermission('framework', 'update')
  @ApiOperation({
    summary:
      'Link (clone) existing requirements from another framework into this one',
  })
  async linkRequirements(
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
    @Body() dto: LinkRequirementsDto,
  ) {
    return this.frameworksService.linkRequirements(
      id,
      organizationId,
      dto.requirementIds,
    );
  }

  @Post(':id/requirements/:requirementKey/controls/link')
  @RequirePermission('framework', 'update')
  @ApiOperation({
    summary: 'Link existing org controls to a requirement',
  })
  async linkControls(
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
    @Param('requirementKey') requirementKey: string,
    @Body() dto: LinkControlsDto,
  ) {
    return this.frameworksService.linkControlsToRequirement(
      id,
      requirementKey,
      organizationId,
      dto.controlIds,
    );
  }

  @Get(':id/update-status')
  @RequirePermission('framework', 'read')
  @ApiOperation({ summary: 'Get the update status for a framework instance' })
  async getUpdateStatus(
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
  ) {
    const data = await this.frameworksService.getUpdateStatus({
      organizationId,
      frameworkInstanceId: id,
    });
    return { data };
  }

  @Get(':id/update-preview')
  @RequirePermission('framework', 'read')
  @ApiOperation({ summary: 'Preview changes from updating a framework instance' })
  async getUpdatePreview(
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
  ) {
    const data = await this.frameworksService.getUpdatePreview({
      organizationId,
      frameworkInstanceId: id,
    });
    return { data };
  }

  @Post(':id/sync')
  @RequirePermission('framework', 'update')
  @ApiOperation({ summary: 'Sync a framework instance to a target version' })
  async syncFramework(
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
    @Body() body: SyncFrameworkDto,
    @AuthContext() authContext: AuthContextType,
  ) {
    if (!authContext.memberId) throw new BadRequestException('Member ID not available');
    const result = await this.syncService.sync({
      organizationId,
      frameworkInstanceId: id,
      targetVersionId: body.targetVersionId,
      memberId: authContext.memberId,
    });
    return { data: result };
  }

  @Post(':id/rollback')
  @RequirePermission('framework', 'update')
  @ApiOperation({ summary: 'Roll back a framework sync operation' })
  async rollbackFramework(
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
    @Body() body: RollbackFrameworkDto,
    @AuthContext() authContext: AuthContextType,
  ) {
    if (!authContext.memberId) throw new BadRequestException('Member ID not available');
    const result = await this.rollbackService.rollback({
      organizationId,
      frameworkInstanceId: id,
      syncOperationId: body.syncOperationId,
      memberId: authContext.memberId,
    });
    return { data: result };
  }

  @Get(':id/sync-history')
  @RequirePermission('framework', 'read')
  @ApiOperation({ summary: 'Get sync history for a framework instance' })
  async getSyncHistory(
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
  ) {
    const data = await this.frameworksService.getSyncHistory({
      organizationId,
      frameworkInstanceId: id,
    });
    return { data, count: data.length };
  }

  @Delete(':id')
  @RequirePermission('framework', 'delete')
  @ApiOperation({ summary: 'Delete a framework instance' })
  async delete(
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
  ) {
    return this.frameworksService.delete(id, organizationId);
  }
}
