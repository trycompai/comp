import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import { HybridAuthGuard } from '../auth/hybrid-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { RequirePermission } from '../auth/require-permission.decorator';
import { SkipOrgCheck } from '../auth/skip-org-check.decorator';
import { AuthContext, OrganizationId } from '../auth/auth-context.decorator';
import type { AuthContext as AuthContextType } from '../auth/types';
import { FrameworksService } from './frameworks.service';
import { AddFrameworksDto } from './dto/add-frameworks.dto';
import { CreateCustomFrameworkDto } from './dto/create-custom-framework.dto';
import { CreateCustomRequirementDto } from './dto/create-custom-requirement.dto';
import { LinkRequirementsDto } from './dto/link-requirements.dto';
import { LinkControlsDto } from './dto/link-controls.dto';

@ApiTags('Frameworks')
@ApiBearerAuth()
@UseGuards(HybridAuthGuard, PermissionGuard)
@Controller({ path: 'frameworks', version: '1' })
export class FrameworksController {
  constructor(private readonly frameworksService: FrameworksService) {}

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
  async findAvailable(@OrganizationId() organizationId?: string) {
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
  ) {
    return this.frameworksService.addFrameworks(
      organizationId,
      dto.frameworkIds,
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
