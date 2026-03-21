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
import { CreateControlTemplateDto } from './dto/create-control-template.dto';
import { UpdateControlTemplateDto } from './dto/update-control-template.dto';
import { ControlTemplateService } from './control-template.service';

@ApiTags('Framework Editor Control Templates')
@Controller({ path: 'framework-editor/control-template', version: '1' })
@UseGuards(HybridAuthGuard, PermissionGuard)
@ApiSecurity('apikey')
export class ControlTemplateController {
  constructor(private readonly service: ControlTemplateService) {}

  @Get()
  @RequirePermission('framework', 'read')
  async findAll(
    @Query('take') take?: string,
    @Query('skip') skip?: string,
  ) {
    const limit = Math.min(Number(take) || 500, 500);
    const offset = Number(skip) || 0;
    return this.service.findAll(limit, offset);
  }

  @Post()
  @RequirePermission('framework', 'create')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async create(@Body() dto: CreateControlTemplateDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @RequirePermission('framework', 'update')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateControlTemplateDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @RequirePermission('framework', 'delete')
  async delete(@Param('id') id: string) {
    return this.service.delete(id);
  }

  @Post(':id/requirements/:reqId')
  @RequirePermission('framework', 'update')
  async linkRequirement(
    @Param('id') id: string,
    @Param('reqId') reqId: string,
  ) {
    return this.service.linkRequirement(id, reqId);
  }

  @Delete(':id/requirements/:reqId')
  @RequirePermission('framework', 'update')
  async unlinkRequirement(
    @Param('id') id: string,
    @Param('reqId') reqId: string,
  ) {
    return this.service.unlinkRequirement(id, reqId);
  }

  @Post(':id/policy-templates/:ptId')
  @RequirePermission('framework', 'update')
  async linkPolicyTemplate(
    @Param('id') id: string,
    @Param('ptId') ptId: string,
  ) {
    return this.service.linkPolicyTemplate(id, ptId);
  }

  @Delete(':id/policy-templates/:ptId')
  @RequirePermission('framework', 'update')
  async unlinkPolicyTemplate(
    @Param('id') id: string,
    @Param('ptId') ptId: string,
  ) {
    return this.service.unlinkPolicyTemplate(id, ptId);
  }

  @Post(':id/task-templates/:ttId')
  @RequirePermission('framework', 'update')
  async linkTaskTemplate(
    @Param('id') id: string,
    @Param('ttId') ttId: string,
  ) {
    return this.service.linkTaskTemplate(id, ttId);
  }

  @Delete(':id/task-templates/:ttId')
  @RequirePermission('framework', 'update')
  async unlinkTaskTemplate(
    @Param('id') id: string,
    @Param('ttId') ttId: string,
  ) {
    return this.service.unlinkTaskTemplate(id, ttId);
  }
}
