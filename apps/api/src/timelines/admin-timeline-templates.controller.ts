import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { PlatformAdminGuard } from '../auth/platform-admin.guard';
import { TimelinesTemplatesService } from './timelines-templates.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { CreatePhaseTemplateDto } from './dto/create-phase-template.dto';
import { UpdatePhaseTemplateDto } from './dto/update-phase-template.dto';
import { PhaseCompletionType } from '@db';

@ApiExcludeController()
@Controller({ path: 'admin/timeline-templates', version: '1' })
@UseGuards(PlatformAdminGuard)
@Throttle({ default: { ttl: 60000, limit: 30 } })
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
export class AdminTimelineTemplatesController {
  constructor(
    private readonly templatesService: TimelinesTemplatesService,
  ) {}

  @Get()
  async findAll() {
    const data = await this.templatesService.findAll();
    return { data, count: data.length };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.templatesService.findOne(id);
  }

  @Post()
  async create(@Body() dto: CreateTemplateDto) {
    return this.templatesService.create({
      frameworkId: dto.frameworkId,
      name: dto.name,
      cycleNumber: dto.cycleNumber,
    });
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateTemplateDto) {
    return this.templatesService.update(id, {
      name: dto.name,
      cycleNumber: dto.cycleNumber,
    });
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.templatesService.delete(id);
  }

  @Post(':id/phases')
  async addPhase(
    @Param('id') templateId: string,
    @Body() dto: CreatePhaseTemplateDto,
  ) {
    return this.templatesService.addPhase(templateId, {
      name: dto.name,
      description: dto.description,
      groupLabel: dto.groupLabel,
      orderIndex: dto.orderIndex,
      defaultDurationWeeks: dto.defaultDurationWeeks,
      completionType: dto.completionType as PhaseCompletionType | undefined,
      locksTimelineOnComplete: dto.locksTimelineOnComplete,
    });
  }

  @Patch(':id/phases/:phaseId')
  async updatePhase(
    @Param('id') templateId: string,
    @Param('phaseId') phaseId: string,
    @Body() dto: UpdatePhaseTemplateDto,
  ) {
    return this.templatesService.updatePhase(templateId, phaseId, {
      name: dto.name,
      description: dto.description,
      groupLabel: dto.groupLabel,
      orderIndex: dto.orderIndex,
      defaultDurationWeeks: dto.defaultDurationWeeks,
      completionType: dto.completionType as PhaseCompletionType | undefined,
      locksTimelineOnComplete: dto.locksTimelineOnComplete,
    });
  }

  @Delete(':id/phases/:phaseId')
  async deletePhase(
    @Param('id') templateId: string,
    @Param('phaseId') phaseId: string,
  ) {
    return this.templatesService.deletePhase(templateId, phaseId);
  }
}
