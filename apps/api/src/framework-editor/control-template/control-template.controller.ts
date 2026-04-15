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
import { CreateControlTemplateDto } from './dto/create-control-template.dto';
import { UpdateControlTemplateDto } from './dto/update-control-template.dto';
import { ControlTemplateService } from './control-template.service';

@ApiTags('Framework Editor Control Templates')
@Controller({ path: 'framework-editor/control-template', version: '1' })
@UseGuards(PlatformAdminGuard)
export class ControlTemplateController {
  constructor(private readonly service: ControlTemplateService) {}

  @Get()
  async findAll(
    @Query('take') take?: string,
    @Query('skip') skip?: string,
    @Query('frameworkId') frameworkId?: string,
  ) {
    const limit = Math.min(Number(take) || 500, 500);
    const offset = Number(skip) || 0;
    return this.service.findAll(limit, offset, frameworkId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Post()
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async create(
    @Body() dto: CreateControlTemplateDto,
    @Query('frameworkId') frameworkId?: string,
  ) {
    return this.service.create(dto, frameworkId);
  }

  @Patch(':id')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async update(@Param('id') id: string, @Body() dto: UpdateControlTemplateDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.service.delete(id);
  }

  @Post(':id/requirements/:reqId')
  async linkRequirement(
    @Param('id') id: string,
    @Param('reqId') reqId: string,
  ) {
    return this.service.linkRequirement(id, reqId);
  }

  @Delete(':id/requirements/:reqId')
  async unlinkRequirement(
    @Param('id') id: string,
    @Param('reqId') reqId: string,
  ) {
    return this.service.unlinkRequirement(id, reqId);
  }

  @Post(':id/policy-templates/:ptId')
  async linkPolicyTemplate(
    @Param('id') id: string,
    @Param('ptId') ptId: string,
  ) {
    return this.service.linkPolicyTemplate(id, ptId);
  }

  @Delete(':id/policy-templates/:ptId')
  async unlinkPolicyTemplate(
    @Param('id') id: string,
    @Param('ptId') ptId: string,
  ) {
    return this.service.unlinkPolicyTemplate(id, ptId);
  }

  @Post(':id/task-templates/:ttId')
  async linkTaskTemplate(@Param('id') id: string, @Param('ttId') ttId: string) {
    return this.service.linkTaskTemplate(id, ttId);
  }

  @Delete(':id/task-templates/:ttId')
  async unlinkTaskTemplate(
    @Param('id') id: string,
    @Param('ttId') ttId: string,
  ) {
    return this.service.unlinkTaskTemplate(id, ttId);
  }
}
