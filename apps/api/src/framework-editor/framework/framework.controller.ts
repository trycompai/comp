import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags, ApiSecurity } from '@nestjs/swagger';
import { HybridAuthGuard } from '../../auth/hybrid-auth.guard';
import { PermissionGuard } from '../../auth/permission.guard';
import { RequirePermission } from '../../auth/require-permission.decorator';
import { CreateFrameworkDto } from './dto/create-framework.dto';
import { UpdateFrameworkDto } from './dto/update-framework.dto';
import { FrameworkEditorFrameworkService } from './framework.service';

@ApiTags('Framework Editor Frameworks')
@Controller({ path: 'framework-editor/framework', version: '1' })
@UseGuards(HybridAuthGuard, PermissionGuard)
@ApiSecurity('apikey')
export class FrameworkEditorFrameworkController {
  constructor(
    private readonly frameworkService: FrameworkEditorFrameworkService,
  ) {}

  @Get()
  @RequirePermission('framework', 'read')
  async findAll(
    @Query('take') take?: string,
    @Query('skip') skip?: string,
  ) {
    const limit = Math.min(Number(take) || 500, 500);
    const offset = Number(skip) || 0;
    return this.frameworkService.findAll(limit, offset);
  }

  @Get(':id')
  @RequirePermission('framework', 'read')
  async findById(@Param('id') id: string) {
    return this.frameworkService.findById(id);
  }

  @Post()
  @RequirePermission('framework', 'create')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async create(@Body() dto: CreateFrameworkDto) {
    return this.frameworkService.create(dto);
  }

  @Patch(':id')
  @RequirePermission('framework', 'update')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async update(@Param('id') id: string, @Body() dto: UpdateFrameworkDto) {
    return this.frameworkService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermission('framework', 'delete')
  async delete(@Param('id') id: string) {
    return this.frameworkService.delete(id);
  }

  @Get(':id/controls')
  @RequirePermission('framework', 'read')
  async getControls(@Param('id') id: string) {
    return this.frameworkService.getControls(id);
  }

  @Get(':id/policies')
  @RequirePermission('framework', 'read')
  async getPolicies(@Param('id') id: string) {
    return this.frameworkService.getPolicies(id);
  }

  @Get(':id/tasks')
  @RequirePermission('framework', 'read')
  async getTasks(@Param('id') id: string) {
    return this.frameworkService.getTasks(id);
  }

  @Get(':id/documents')
  @RequirePermission('framework', 'read')
  async getDocuments(@Param('id') id: string) {
    return this.frameworkService.getDocuments(id);
  }
}
