import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
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
import { FrameworkInstanceRequirementsService } from './framework-instance-requirements.service';
import { CreateFrameworkInstanceRequirementDto } from './dto/create-framework-instance-requirement.dto';
import { UpdateFrameworkInstanceRequirementDto } from './dto/update-framework-instance-requirement.dto';

@ApiTags('Framework Instance Requirements')
@ApiBearerAuth()
@UseGuards(HybridAuthGuard, PermissionGuard)
@Controller({ path: 'framework-instance-requirements', version: '1' })
export class FrameworkInstanceRequirementsController {
  constructor(
    private readonly service: FrameworkInstanceRequirementsService,
  ) {}

  @Get()
  @RequirePermission('framework', 'read')
  @ApiOperation({
    summary: 'List custom requirements for a framework instance',
  })
  @ApiQuery({ name: 'frameworkInstanceId', required: true, type: String })
  async findAll(
    @OrganizationId() organizationId: string,
    @Query('frameworkInstanceId') frameworkInstanceId: string,
  ) {
    const data = await this.service.findAll(
      frameworkInstanceId,
      organizationId,
    );
    return { data, count: data.length };
  }

  @Get(':id')
  @RequirePermission('framework', 'read')
  @ApiOperation({ summary: 'Get a single framework instance requirement' })
  async findOne(
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
  ) {
    return this.service.findOne(id, organizationId);
  }

  @Post()
  @RequirePermission('framework', 'create')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  @ApiOperation({ summary: 'Create a framework instance requirement' })
  async create(
    @OrganizationId() organizationId: string,
    @Body() dto: CreateFrameworkInstanceRequirementDto,
  ) {
    return this.service.create(dto, organizationId);
  }

  @Patch(':id')
  @RequirePermission('framework', 'update')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  @ApiOperation({ summary: 'Update a framework instance requirement' })
  async update(
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
    @Body() dto: UpdateFrameworkInstanceRequirementDto,
  ) {
    return this.service.update(id, dto, organizationId);
  }

  @Delete(':id')
  @RequirePermission('framework', 'delete')
  @ApiOperation({ summary: 'Delete a framework instance requirement' })
  async delete(
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
  ) {
    return this.service.delete(id, organizationId);
  }
}
