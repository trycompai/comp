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
import { CreatePolicyTemplateDto } from './dto/create-policy-template.dto';
import { UpdatePolicyContentDto } from './dto/update-policy-content.dto';
import { UpdatePolicyTemplateDto } from './dto/update-policy-template.dto';
import { PolicyTemplateService } from './policy-template.service';

@ApiTags('Framework Editor Policy Templates')
@Controller({ path: 'framework-editor/policy-template', version: '1' })
@UseGuards(HybridAuthGuard, PermissionGuard)
@ApiSecurity('apikey')
export class PolicyTemplateController {
  constructor(private readonly service: PolicyTemplateService) {}

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

  @Get(':id')
  @RequirePermission('framework', 'read')
  async findById(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Post()
  @RequirePermission('framework', 'create')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async create(@Body() dto: CreatePolicyTemplateDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @RequirePermission('framework', 'update')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async update(
    @Param('id') id: string,
    @Body() dto: UpdatePolicyTemplateDto,
  ) {
    return this.service.update(id, dto);
  }

  @Patch(':id/content')
  @RequirePermission('framework', 'update')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async updateContent(
    @Param('id') id: string,
    @Body() dto: UpdatePolicyContentDto,
  ) {
    return this.service.updateContent(id, dto.content);
  }

  @Delete(':id')
  @RequirePermission('framework', 'delete')
  async delete(@Param('id') id: string) {
    return this.service.delete(id);
  }
}
