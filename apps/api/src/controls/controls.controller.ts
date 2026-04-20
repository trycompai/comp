import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseEnumPipe,
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
import { OrganizationId } from '../auth/auth-context.decorator';
import { ControlsService } from './controls.service';
import { CreateControlDto } from './dto/create-control.dto';
import { LinkPoliciesDto } from './dto/link-policies.dto';
import { LinkTasksDto } from './dto/link-tasks.dto';
import { LinkRequirementsToControlDto } from './dto/link-requirements.dto';
import { LinkDocumentTypesDto } from './dto/link-document-types.dto';
import { EvidenceFormType } from '@db';

@ApiTags('Controls')
@ApiBearerAuth()
@UseGuards(HybridAuthGuard, PermissionGuard)
@Controller({ path: 'controls', version: '1' })
export class ControlsController {
  constructor(private readonly controlsService: ControlsService) {}

  @Get()
  @RequirePermission('control', 'read')
  @ApiOperation({ summary: 'List controls with relations' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'perPage', required: false })
  @ApiQuery({
    name: 'name',
    required: false,
    description: 'Filter by name (case-insensitive contains)',
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    description: 'Field to sort by (default: name)',
  })
  @ApiQuery({
    name: 'sortDesc',
    required: false,
    description: 'Sort descending (true/false)',
  })
  async findAll(
    @OrganizationId() organizationId: string,
    @Query('page') page?: string,
    @Query('perPage') perPage?: string,
    @Query('name') name?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortDesc') sortDesc?: string,
  ) {
    return this.controlsService.findAll(organizationId, {
      page: page ? parseInt(page, 10) : 1,
      perPage: perPage ? parseInt(perPage, 10) : 50,
      name,
      sortBy,
      sortDesc: sortDesc === 'true',
    });
  }

  @Get('options')
  @RequirePermission('control', 'read')
  @ApiOperation({ summary: 'Get dropdown options for creating controls' })
  async getOptions(@OrganizationId() organizationId: string) {
    return this.controlsService.getOptions(organizationId);
  }

  @Get(':id')
  @RequirePermission('control', 'read')
  @ApiOperation({ summary: 'Get control detail with progress' })
  async findOne(
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
  ) {
    return this.controlsService.findOne(id, organizationId);
  }

  @Post()
  @RequirePermission('control', 'create')
  @ApiOperation({ summary: 'Create a new control' })
  async create(
    @OrganizationId() organizationId: string,
    @Body() dto: CreateControlDto,
  ) {
    return this.controlsService.create(organizationId, dto);
  }

  @Post(':id/policies/link')
  @RequirePermission('control', 'update')
  @ApiOperation({ summary: 'Link existing policies to a control' })
  async linkPolicies(
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
    @Body() dto: LinkPoliciesDto,
  ) {
    return this.controlsService.linkPolicies(
      id,
      organizationId,
      dto.policyIds,
    );
  }

  @Post(':id/tasks/link')
  @RequirePermission('control', 'update')
  @ApiOperation({ summary: 'Link existing tasks to a control' })
  async linkTasks(
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
    @Body() dto: LinkTasksDto,
  ) {
    return this.controlsService.linkTasks(id, organizationId, dto.taskIds);
  }

  @Post(':id/requirements/link')
  @RequirePermission('control', 'update')
  @ApiOperation({ summary: 'Link existing requirements to a control' })
  async linkRequirements(
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
    @Body() dto: LinkRequirementsToControlDto,
  ) {
    return this.controlsService.linkRequirements(
      id,
      organizationId,
      dto.requirements,
    );
  }

  @Post(':id/document-types/link')
  @RequirePermission('control', 'update')
  @ApiOperation({ summary: 'Link required document types to a control' })
  async linkDocumentTypes(
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
    @Body() dto: LinkDocumentTypesDto,
  ) {
    return this.controlsService.linkDocumentTypes(
      id,
      organizationId,
      dto.formTypes,
    );
  }

  @Delete(':id/document-types/:formType')
  @RequirePermission('control', 'update')
  @ApiOperation({ summary: 'Remove a required document type from a control' })
  async unlinkDocumentType(
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
    @Param('formType', new ParseEnumPipe(EvidenceFormType))
    formType: EvidenceFormType,
  ) {
    return this.controlsService.unlinkDocumentType(
      id,
      organizationId,
      formType,
    );
  }

  @Delete(':id')
  @RequirePermission('control', 'delete')
  @ApiOperation({ summary: 'Delete a control' })
  async delete(
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
  ) {
    return this.controlsService.delete(id, organizationId);
  }
}
