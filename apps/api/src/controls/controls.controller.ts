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
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { HybridAuthGuard } from '../auth/hybrid-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { RequirePermission } from '../auth/require-permission.decorator';
import { OrganizationId } from '../auth/auth-context.decorator';
import { ControlsService } from './controls.service';
import { CreateControlDto } from './dto/create-control.dto';

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
  @ApiQuery({ name: 'name', required: false, description: 'Filter by name (case-insensitive contains)' })
  @ApiQuery({ name: 'sortBy', required: false, description: 'Field to sort by (default: name)' })
  @ApiQuery({ name: 'sortDesc', required: false, description: 'Sort descending (true/false)' })
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
