import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Req,
  BadRequestException,
  UseGuards,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { PlatformAdminGuard } from '../auth/platform-admin.guard';
import { AdminAuditLogInterceptor } from '../admin-organizations/admin-audit-log.interceptor';
import { TimelinesService } from './timelines.service';
import { TimelinesPhasesService } from './timelines-phases.service';
import { ActivateTimelineDto } from './dto/activate-timeline.dto';
import { UpdatePhaseDto } from './dto/update-phase.dto';
import { AddPhaseToInstanceDto } from './dto/create-phase-template.dto';
import { UnlockTimelineDto } from './dto/unlock-timeline.dto';
import { PhaseCompletionType } from '@db';

@ApiExcludeController()
@Controller({ path: 'admin/organizations', version: '1' })
@UseGuards(PlatformAdminGuard)
@UseInterceptors(AdminAuditLogInterceptor)
@Throttle({ default: { ttl: 60000, limit: 30 } })
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
export class AdminOrgTimelinesController {
  constructor(
    private readonly timelinesService: TimelinesService,
    private readonly phasesService: TimelinesPhasesService,
  ) {}

  @Get(':orgId/timelines')
  async findAll(@Param('orgId') orgId: string) {
    const data = await this.timelinesService.findAllForOrganization(orgId);
    return { data, count: data.length };
  }

  @Post(':orgId/timelines/:id/activate')
  async activate(
    @Param('orgId') orgId: string,
    @Param('id') id: string,
    @Body() dto: ActivateTimelineDto,
  ) {
    return this.timelinesService.activate(
      id,
      orgId,
      new Date(dto.startDate),
    );
  }

  @Post(':orgId/timelines/:id/pause')
  async pause(
    @Param('orgId') orgId: string,
    @Param('id') id: string,
  ) {
    return this.timelinesService.pauseTimeline(id, orgId);
  }

  @Post(':orgId/timelines/:id/resume')
  async resume(
    @Param('orgId') orgId: string,
    @Param('id') id: string,
  ) {
    return this.timelinesService.resumeTimeline(id, orgId);
  }

  @Patch(':orgId/timelines/:id/phases/:phaseId')
  async updatePhase(
    @Param('orgId') orgId: string,
    @Param('id') id: string,
    @Param('phaseId') phaseId: string,
    @Body() dto: UpdatePhaseDto,
  ) {
    return this.phasesService.updatePhase(id, phaseId, orgId, {
      name: dto.name,
      description: dto.description,
      durationWeeks: dto.durationWeeks,
      startDate: dto.startDate ? new Date(dto.startDate) : undefined,
      endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      datesPinned: dto.datesPinned,
      completionType: dto.completionType as PhaseCompletionType | undefined,
      locksTimelineOnComplete: dto.locksTimelineOnComplete,
    });
  }

  @Post(':orgId/timelines/:id/phases')
  async addPhase(
    @Param('orgId') orgId: string,
    @Param('id') id: string,
    @Body() dto: AddPhaseToInstanceDto,
  ) {
    return this.phasesService.addPhase(id, orgId, {
      name: dto.name,
      description: dto.description,
      orderIndex: dto.orderIndex,
      durationWeeks: dto.durationWeeks,
      completionType: dto.completionType as PhaseCompletionType | undefined,
    });
  }

  @Delete(':orgId/timelines/:id/phases/:phaseId')
  async removePhase(
    @Param('orgId') orgId: string,
    @Param('id') id: string,
    @Param('phaseId') phaseId: string,
  ) {
    return this.phasesService.removePhase(id, phaseId, orgId);
  }

  @Post(':orgId/timelines/:id/phases/:phaseId/complete')
  async completePhase(
    @Param('orgId') orgId: string,
    @Param('id') id: string,
    @Param('phaseId') phaseId: string,
    @Req() req: { userId?: string },
  ) {
    return this.timelinesService.completePhase(id, phaseId, orgId, req.userId);
  }

  @Post(':orgId/timelines/:id/next-cycle')
  async startNextCycle(
    @Param('orgId') orgId: string,
    @Param('id') id: string,
  ) {
    return this.timelinesService.startNextCycle(id, orgId);
  }

  @Post(':orgId/timelines/:id/reset')
  async resetTimeline(
    @Param('orgId') orgId: string,
    @Param('id') id: string,
  ) {
    return this.timelinesService.resetInstance(id, orgId);
  }

  @Post(':orgId/timelines/:id/unlock')
  async unlockTimeline(
    @Param('orgId') orgId: string,
    @Param('id') id: string,
    @Body() dto: UnlockTimelineDto,
    @Req() req: { userId?: string },
  ) {
    if (!req.userId) {
      throw new BadRequestException('Unable to resolve acting admin user');
    }

    return this.timelinesService.unlockTimeline(
      id,
      orgId,
      req.userId,
      dto.unlockReason,
    );
  }

  @Delete(':orgId/timelines/:id')
  async deleteTimeline(
    @Param('orgId') orgId: string,
    @Param('id') id: string,
  ) {
    return this.timelinesService.deleteInstance(id, orgId);
  }

  @Post(':orgId/timelines/recreate')
  async recreateTimelines(@Param('orgId') orgId: string) {
    return this.timelinesService.recreateAllForOrganization(orgId);
  }
}
