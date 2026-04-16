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
import { CreatePolicyTemplateDto } from './dto/create-policy-template.dto';
import { UpdatePolicyContentDto } from './dto/update-policy-content.dto';
import { UpdatePolicyTemplateDto } from './dto/update-policy-template.dto';
import { PolicyTemplateService } from './policy-template.service';

@ApiTags('Framework Editor Policy Templates')
@Controller({ path: 'framework-editor/policy-template', version: '1' })
@UseGuards(PlatformAdminGuard)
export class PolicyTemplateController {
  constructor(private readonly service: PolicyTemplateService) {}

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
  async findById(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Post()
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async create(
    @Body() dto: CreatePolicyTemplateDto,
    @Query('frameworkId') frameworkId?: string,
  ) {
    return this.service.create(dto, frameworkId);
  }

  @Patch(':id')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async update(@Param('id') id: string, @Body() dto: UpdatePolicyTemplateDto) {
    return this.service.update(id, dto);
  }

  @Patch(':id/content')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async updateContent(
    @Param('id') id: string,
    @Body() dto: UpdatePolicyContentDto,
  ) {
    return this.service.updateContent(id, dto.content);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.service.delete(id);
  }
}
