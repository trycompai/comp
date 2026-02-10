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
import { OrganizationId, UserId } from '../auth/auth-context.decorator';
import { FrameworksService } from './frameworks.service';
import { AddFrameworksDto } from './dto/add-frameworks.dto';

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
  @RequirePermission('framework', 'read')
  @ApiOperation({ summary: 'List available frameworks to add' })
  async findAvailable() {
    const data = await this.frameworksService.findAvailable();
    return { data, count: data.length };
  }

  @Get('scores')
  @RequirePermission('framework', 'read')
  @ApiOperation({ summary: 'Get overview compliance scores' })
  async getScores(
    @OrganizationId() organizationId: string,
    @UserId() userId: string,
  ) {
    return this.frameworksService.getScores(organizationId, userId);
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
