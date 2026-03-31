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
import { ApiTags } from '@nestjs/swagger';
import { PlatformAdminGuard } from '../../auth/platform-admin.guard';
import { CreateFrameworkDto } from './dto/create-framework.dto';
import { UpdateFrameworkDto } from './dto/update-framework.dto';
import { FrameworkEditorFrameworkService } from './framework.service';

@ApiTags('Framework Editor Frameworks')
@Controller({ path: 'framework-editor/framework', version: '1' })
@UseGuards(PlatformAdminGuard)
export class FrameworkEditorFrameworkController {
  constructor(
    private readonly frameworkService: FrameworkEditorFrameworkService,
  ) {}

  @Get()
  async findAll(
    @Query('take') take?: string,
    @Query('skip') skip?: string,
  ) {
    const limit = Math.min(Number(take) || 500, 500);
    const offset = Number(skip) || 0;
    return this.frameworkService.findAll(limit, offset);
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.frameworkService.findById(id);
  }

  @Post()
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async create(@Body() dto: CreateFrameworkDto) {
    return this.frameworkService.create(dto);
  }

  @Patch(':id')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async update(@Param('id') id: string, @Body() dto: UpdateFrameworkDto) {
    return this.frameworkService.update(id, dto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.frameworkService.delete(id);
  }

  @Get(':id/controls')
  async getControls(@Param('id') id: string) {
    return this.frameworkService.getControls(id);
  }

  @Get(':id/policies')
  async getPolicies(@Param('id') id: string) {
    return this.frameworkService.getPolicies(id);
  }

  @Get(':id/tasks')
  async getTasks(@Param('id') id: string) {
    return this.frameworkService.getTasks(id);
  }

  @Get(':id/documents')
  async getDocuments(@Param('id') id: string) {
    return this.frameworkService.getDocuments(id);
  }

  @Post(':id/link-control/:controlId')
  async linkControl(
    @Param('id') id: string,
    @Param('controlId') controlId: string,
  ) {
    return this.frameworkService.linkControl(id, controlId);
  }

  @Post(':id/link-task/:taskId')
  async linkTask(
    @Param('id') id: string,
    @Param('taskId') taskId: string,
  ) {
    return this.frameworkService.linkTask(id, taskId);
  }

  @Post(':id/link-policy/:policyId')
  async linkPolicy(
    @Param('id') id: string,
    @Param('policyId') policyId: string,
  ) {
    return this.frameworkService.linkPolicy(id, policyId);
  }
}
